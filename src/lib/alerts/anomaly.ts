import { prisma } from '@/lib/prisma';

/**
 * ★启发式声明：这是朴素的滑动窗口规则，不是统计异常检测。★
 *
 * 触发条件（窗口内消耗需同时满足 1 与 2）：
 * 1) windowCost ≥ BURST_MIN_CNY（地板值，默认 ¥1，防小额高频误报）
 * 2) 满足以下任一规则（OR 语义）：
 *    a. windowCost ≥ 月预算 × BURST_BUDGET_RATIO（默认：10 分钟烧掉月预算 20%）
 *    b. windowCost ≥ 过去 24h 窗口均值 × BURST_MULTIPLIER（默认：10 分钟消耗是同窗均值 10 倍）
 *
 * 为什么是 OR 而不是 max：取 max 时"预算占比"阈值（月预算 20%）通常远大于
 * "均值倍数"阈值（预算正常应覆盖数百个窗口），均值规则将几乎永不生效，突增
 * 检测形同虚设。OR 让两条规则各自把关：慢烧预算靠 a，突发异常靠 b；
 * 误报由地板值 + 每小时去重（dedupKey）兜底。
 *
 * 已知误报 / 漏报场景（接受这种朴素性，换取零依赖与可解释）：
 * - 冷启动（过去 24h 无流量基线）且未设预算 → 不触发（无基准可比较）
 * - 单个超长思考请求的正常大额账单可能误触发
 * - 缓慢而持续的泄漏（每窗口略低于阈值）不会触发 —— 靠 80%/100% 阈值兜底
 */

export interface BurstConfig {
  windowMinutes: number;
  budgetRatio: number;
  multiplier: number;
  minCny: number;
}

export interface BurstInput {
  windowCost: number;
  monthlyBudget: number | null;
  /** 过去 24h（不含当前窗口）折算到单窗口的平均消耗 */
  trailingAvgPerWindow: number;
  cfg: BurstConfig;
}

export interface BurstVerdict {
  alert: boolean;
  reason?: string;
}

export function shouldAlertBurst(input: BurstInput): BurstVerdict {
  const { windowCost, monthlyBudget, trailingAvgPerWindow, cfg } = input;
  if (windowCost < cfg.minCny) return { alert: false };

  const thresholds: Array<{ value: number; label: string }> = [];
  if (monthlyBudget != null && monthlyBudget > 0) {
    thresholds.push({
      value: monthlyBudget * cfg.budgetRatio,
      label: `月预算的 ${Math.round(cfg.budgetRatio * 100)}%`,
    });
  }
  if (trailingAvgPerWindow > 0) {
    thresholds.push({
      value: trailingAvgPerWindow * cfg.multiplier,
      label: `24h 窗口均值的 ${cfg.multiplier} 倍`,
    });
  }
  if (thresholds.length === 0) return { alert: false }; // 无预算且无基线：冷启动不判

  const hit = thresholds.find((t) => t.value > 0 && windowCost >= t.value);
  if (!hit) return { alert: false };
  return {
    alert: true,
    reason: `${cfg.windowMinutes} 分钟内消耗 ¥${windowCost.toFixed(2)}，超过${hit.label}阈值`,
  };
}

/** 查库并按启发式判定（每条 UsageLog 落库后调用） */
export async function checkBurst(
  project: { id: string; monthlyBudget: number | null },
  now: Date,
  cfg: BurstConfig,
): Promise<BurstVerdict> {
  const windowMs = cfg.windowMinutes * 60_000;
  const dayMs = 24 * 60 * 60_000;

  const [windowAgg, trailingAgg] = await Promise.all([
    prisma.usageLog.aggregate({
      _sum: { costCny: true },
      where: { projectId: project.id, createdAt: { gte: new Date(now.getTime() - windowMs) } },
    }),
    prisma.usageLog.aggregate({
      _sum: { costCny: true },
      where: {
        projectId: project.id,
        createdAt: { gte: new Date(now.getTime() - dayMs), lt: new Date(now.getTime() - windowMs) },
      },
    }),
  ]);

  const windowCost = Number(windowAgg._sum.costCny ?? 0);
  const trailingTotal = Number(trailingAgg._sum.costCny ?? 0);
  const windowsInTrailing = (dayMs - windowMs) / windowMs;
  const trailingAvgPerWindow = windowsInTrailing > 0 ? trailingTotal / windowsInTrailing : 0;

  return shouldAlertBurst({
    windowCost,
    monthlyBudget: project.monthlyBudget,
    trailingAvgPerWindow,
    cfg,
  });
}
