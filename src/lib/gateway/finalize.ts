import type { Provider, UsageStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getEnv } from '@/lib/env';
import { computeCost, type CostBreakdown, type TokenUsage } from '@/lib/pricing/cost';
import { checkBurst } from '@/lib/alerts/anomaly';
import { sendAlert } from '@/lib/alerts/channels';
import { estimateTokens } from './estimate';
import { crossedThresholds, currentDay, currentMonth, monthSpend } from './budget';

/**
 * 请求收尾（fire-and-forget，绝不向调用方抛错）：
 * token 统计（必要时估算兜底）→ 双币种成本 → UsageLog 落库 →
 * 预算阈值跨越判定 → 突增检测 → 告警分发。
 *
 * 调用时机：
 * - 流式：SSE 流完整送出之后（stream.ts flush / cancel 回调）
 * - 非流式：上游 JSON 解析完成之后
 *
 * 计费口径：SUCCESS 与 CLIENT_ABORTED（中断前已生成的部分照常入账）计费；
 * UPSTREAM_ERROR / BLOCKED 成本记 0、不做估算（没有发生真实生成）。
 */

export interface CharCounts {
  ascii: number;
  cjk: number;
}

export interface FinalizeContext {
  project: {
    id: string;
    name: string;
    provider: Provider;
    monthlyBudget: number | null;
    budgetCurrency: 'CNY' | 'USD';
  };
  keyId: string | null;
  model: string;
  streaming: boolean;
  status: UsageStatus;
  httpStatus: number | null;
  errorDetail?: string;
  /** 上游返回的真实 usage；null = 上游未返回（billable 状态下走字符估算兜底） */
  usage: TokenUsage | null;
  promptChars: CharCounts;
  completionChars: CharCounts;
  latencyMs: number;
  ttfbMs: number | null;
  clientIp: string | null;
}

function estimateFromChars(chars: CharCounts, asciiPer: number, cjkPer: number): number {
  return estimateTokens(chars.ascii, chars.cjk, asciiPer, cjkPer);
}

function zeroBreakdown(rate: number): CostBreakdown {
  return {
    priced: false,
    fallbackUsed: false,
    currency: 'CNY',
    inputPricePerM: 0,
    cachedInputPricePerM: 0,
    outputPricePerM: 0,
    costNative: 0,
    costCny: 0,
    costUsd: 0,
    rateUsdCny: rate,
  };
}

export async function finalizeRequest(ctx: FinalizeContext): Promise<void> {
  try {
    const env = getEnv();
    const billable = ctx.status === 'SUCCESS' || ctx.status === 'CLIENT_ABORTED';

    // ① token：真实 usage 优先；billable 但无 usage 时按字符估算（误差见 estimate.ts）
    let tokensEstimated = false;
    let usage: TokenUsage =
      ctx.usage ?? { promptTokens: 0, cachedTokens: 0, completionTokens: 0 };
    if (billable && !ctx.usage) {
      tokensEstimated = true;
      usage = {
        promptTokens: estimateFromChars(
          ctx.promptChars,
          env.estimate.asciiPerToken,
          env.estimate.cjkPerToken,
        ),
        cachedTokens: 0,
        completionTokens: estimateFromChars(
          ctx.completionChars,
          env.estimate.asciiPerToken,
          env.estimate.cjkPerToken,
        ),
      };
    }

    // ② 成本（双币种 + 单价快照；非 billable 一律记 0）
    const cost = billable
      ? computeCost(ctx.model, usage, {
          usdCnyRate: env.usdCnyRate,
          fallback: env.pricingFallback.enabled
            ? {
                input: env.pricingFallback.input,
                output: env.pricingFallback.output,
                currency: env.pricingFallback.currency,
              }
            : undefined,
        })
      : zeroBreakdown(env.usdCnyRate);

    // ③ 落库
    const now = new Date();
    await prisma.usageLog.create({
      data: {
        projectId: ctx.project.id,
        keyId: ctx.keyId,
        provider: ctx.project.provider,
        model: ctx.model,
        streaming: ctx.streaming,
        status: ctx.status,
        httpStatus: ctx.httpStatus,
        errorDetail: ctx.errorDetail?.slice(0, 200) ?? null,
        promptTokens: usage.promptTokens,
        cachedTokens: usage.cachedTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.promptTokens + usage.completionTokens,
        tokensEstimated,
        promptChars: ctx.promptChars.ascii + ctx.promptChars.cjk || null,
        completionChars: ctx.completionChars.ascii + ctx.completionChars.cjk || null,
        currency: cost.currency,
        inputPricePerM: cost.inputPricePerM,
        cachedInputPricePerM: cost.cachedInputPricePerM,
        outputPricePerM: cost.outputPricePerM,
        costCny: cost.costCny,
        costUsd: cost.costUsd,
        rateUsdCny: cost.rateUsdCny,
        latencyMs: ctx.latencyMs,
        ttfbMs: ctx.ttfbMs,
        clientIp: ctx.clientIp,
        day: currentDay(now),
        month: currentMonth(now),
      },
    });

    // 以下检查只对真实产生了计费的成功/中断请求有意义
    if (!billable || (cost.costCny <= 0 && cost.costUsd <= 0)) return;

    // ④ 预算阈值跨越（月累计已含刚写入的这条）
    if (ctx.project.monthlyBudget != null && ctx.project.monthlyBudget > 0) {
      const spent = await monthSpend(ctx.project.id, ctx.project.budgetCurrency, currentMonth(now));
      const thisCost =
        ctx.project.budgetCurrency === 'CNY' ? cost.costCny : cost.costUsd;
      const prev = spent - thisCost;
      for (const t of crossedThresholds(prev, spent, ctx.project.monthlyBudget)) {
        await sendAlert({
          projectId: ctx.project.id,
          projectName: ctx.project.name,
          type: t,
          spent,
          budget: ctx.project.monthlyBudget,
          currency: ctx.project.budgetCurrency,
        });
      }
    }

    // ⑤ 突增异常（朴素启发式，见 anomaly.ts 头注释）
    const burst = await checkBurst(
      { id: ctx.project.id, monthlyBudget: ctx.project.monthlyBudget },
      now,
      env.burst,
    );
    if (burst.alert && burst.reason) {
      await sendAlert({
        projectId: ctx.project.id,
        projectName: ctx.project.name,
        type: 'BURST',
        detail: burst.reason,
      });
    }
  } catch (err) {
    // 收尾链路绝不向上抛（流已发完 / 响应已返回，这里失败只能记日志）
    console.error('[finalize] 请求收尾失败：', err);
  }
}
