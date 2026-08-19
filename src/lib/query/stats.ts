import { prisma } from '@/lib/prisma';
import type { BreakdownItemDto, TrendPointDto } from '@/lib/types/dto';
import type { LogFilters } from './filters';
import { logWhere } from './filters';

/**
 * 仪表盘聚合查询。
 * - 按 day 冗余列 groupBy（Prisma 无 date_trunc）
 * - Decimal → Number 出口转换（DTO 边界规则）
 * - 周 / 月粒度：日桶查出后在 JS 折叠（轻量场景量级足够）
 */

export interface RangeParams {
  days: number; // 最近 N 天
  projectId?: string;
}

function sinceDay(days: number, now = new Date()): string {
  const d = new Date(now.getTime() - (days - 1) * 24 * 60 * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function rangeWhere(p: RangeParams) {
  return { day: { gte: sinceDay(p.days) }, ...(p.projectId ? { projectId: p.projectId } : {}) };
}

/** 日粒度趋势（含空日补零），再按 granularity 折叠 */
export async function getTrend(
  p: RangeParams,
  granularity: 'day' | 'week' | 'month' = 'day',
): Promise<TrendPointDto[]> {
  const grouped = await prisma.usageLog.groupBy({
    by: ['day'],
    where: rangeWhere(p),
    _sum: {
      costCny: true,
      costUsd: true,
      promptTokens: true,
      completionTokens: true,
    },
    _count: { _all: true },
  });

  const byDay = new Map(
    grouped.map((g) => [
      g.day,
      {
        costCny: Number(g._sum.costCny ?? 0),
        costUsd: Number(g._sum.costUsd ?? 0),
        promptTokens: g._sum.promptTokens ?? 0,
        completionTokens: g._sum.completionTokens ?? 0,
        calls: g._count._all,
      },
    ]),
  );

  // 生成完整日期序列（补零日，图表不间断）
  const days: string[] = [];
  const today = new Date();
  for (let i = p.days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60_000);
    const p2 = (n: number) => String(n).padStart(2, '0');
    days.push(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`);
  }

  const daily: Array<TrendPointDto & { key: string }> = days.map((day) => ({
    key: day,
    label: day.slice(5), // "08-18"
    ...(byDay.get(day) ?? {
      costCny: 0,
      costUsd: 0,
      promptTokens: 0,
      completionTokens: 0,
      calls: 0,
    }),
  }));

  if (granularity === 'day') {
    return daily.map(({ key: _key, ...rest }) => rest);
  }

  // 周（周一为桶起点）/ 月（YYYY-MM）折叠
  const bucketKey =
    granularity === 'month'
      ? (day: string) => day.slice(0, 7)
      : (day: string) => {
          const dt = new Date(`${day}T00:00:00`);
          const dow = (dt.getDay() + 6) % 7; // 周一=0
          const monday = new Date(dt.getTime() - dow * 24 * 60 * 60_000);
          const p2 = (n: number) => String(n).padStart(2, '0');
          return `${monday.getFullYear()}-${p2(monday.getMonth() + 1)}-${p2(monday.getDate())}`;
        };

  const acc = new Map<string, TrendPointDto>();
  for (const d of daily) {
    const k = bucketKey(d.key);
    const cur =
      acc.get(k) ??
      ({
        label: k.slice(5),
        costCny: 0,
        costUsd: 0,
        promptTokens: 0,
        completionTokens: 0,
        calls: 0,
      } as TrendPointDto);
    cur.costCny += d.costCny;
    cur.costUsd += d.costUsd;
    cur.promptTokens += d.promptTokens;
    cur.completionTokens += d.completionTokens;
    cur.calls += d.calls;
    acc.set(k, cur);
  }
  return [...acc.values()];
}

export interface TotalsDto {
  costCny: number;
  costUsd: number;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCalls: number;
  blockedCalls: number;
}

export async function getTotals(p: RangeParams): Promise<TotalsDto> {
  const [agg, est, blocked] = await Promise.all([
    prisma.usageLog.aggregate({
      _sum: { costCny: true, costUsd: true, promptTokens: true, completionTokens: true },
      _count: { _all: true },
      where: rangeWhere(p),
    }),
    prisma.usageLog.count({ where: { ...rangeWhere(p), tokensEstimated: true } }),
    prisma.usageLog.count({ where: { ...rangeWhere(p), status: 'BLOCKED' } }),
  ]);
  return {
    costCny: Number(agg._sum.costCny ?? 0),
    costUsd: Number(agg._sum.costUsd ?? 0),
    calls: agg._count._all,
    promptTokens: agg._sum.promptTokens ?? 0,
    completionTokens: agg._sum.completionTokens ?? 0,
    estimatedCalls: est,
    blockedCalls: blocked,
  };
}

/** 分组汇总：项目 / 模型 / 环境 */
export async function getBreakdown(
  by: 'project' | 'model' | 'environment',
  p: RangeParams,
): Promise<BreakdownItemDto[]> {
  if (by === 'model') {
    const rows = await prisma.usageLog.groupBy({
      by: ['model'],
      where: rangeWhere(p),
      _sum: { costCny: true, costUsd: true },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        label: r.model,
        costCny: Number(r._sum.costCny ?? 0),
        costUsd: Number(r._sum.costUsd ?? 0),
        calls: r._count._all,
      }))
      .sort((a, b) => b.costCny - a.costCny);
  }

  const rows = await prisma.usageLog.groupBy({
    by: ['projectId'],
    where: rangeWhere(p),
    _sum: { costCny: true, costUsd: true },
    _count: { _all: true },
  });
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, environment: true },
  });
  const info = new Map(projects.map((x) => [x.id, x]));

  const items: BreakdownItemDto[] = rows.map((r) => ({
    label:
      by === 'project'
        ? (info.get(r.projectId)?.name ?? r.projectId)
        : (info.get(r.projectId)?.environment ?? 'UNKNOWN'),
    costCny: Number(r._sum.costCny ?? 0),
    costUsd: Number(r._sum.costUsd ?? 0),
    calls: r._count._all,
  }));

  if (by === 'environment') {
    // 环境维度：同名桶合并
    const merged = new Map<string, BreakdownItemDto>();
    for (const it of items) {
      const cur = merged.get(it.label) ?? { label: it.label, costCny: 0, costUsd: 0, calls: 0 };
      cur.costCny += it.costCny;
      cur.costUsd += it.costUsd;
      cur.calls += it.calls;
      merged.set(it.label, cur);
    }
    return [...merged.values()].sort((a, b) => b.costCny - a.costCny);
  }
  return items.sort((a, b) => b.costCny - a.costCny);
}

/** 明细分页（项目名 / 环境映射在应用层完成） */
export async function getLogsPage(f: LogFilters) {
  const where = logWhere(f);
  const [rows, total, projects] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.usageLog.count({ where }),
    prisma.project.findMany({ select: { id: true, name: true, environment: true } }),
  ]);
  const info = new Map(projects.map((x) => [x.id, x]));

  return {
    items: rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      model: r.model,
      provider: r.provider,
      streaming: r.streaming,
      status: r.status,
      httpStatus: r.httpStatus,
      promptTokens: r.promptTokens,
      cachedTokens: r.cachedTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      tokensEstimated: r.tokensEstimated,
      costCny: Number(r.costCny),
      costUsd: Number(r.costUsd),
      currency: r.currency,
      inputPricePerM: Number(r.inputPricePerM),
      outputPricePerM: Number(r.outputPricePerM),
      latencyMs: r.latencyMs,
      ttfbMs: r.ttfbMs,
      errorDetail: r.errorDetail,
      createdAt: r.createdAt.toISOString(),
      projectName: info.get(r.projectId)?.name ?? r.projectId,
      environment: info.get(r.projectId)?.environment ?? 'UNKNOWN',
    })),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}
