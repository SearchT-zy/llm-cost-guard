import type { CurrencyCode } from '../env';
import { MODEL_PRICES, type ModelPrice } from './prices';

/**
 * 成本计算（纯函数）。
 *
 * - 双币种快照：按模型原生货币计价，同时换算出 costCny / costUsd（汇率快照随行落库）。
 * - 缓存命中：cachedInput = 0 的厂商无折扣，命中 token 按常规输入价计（宁可多算不少算）。
 * - 未知模型：未配兜底价 → 只计 token，成本记 0（仪表盘以"单价全 0"识别未计价行）。
 */

export interface TokenUsage {
  promptTokens: number;
  /** 缓存命中输入 token（DeepSeek prompt_cache_hit_tokens / OpenAI prompt_tokens_details.cached_tokens） */
  cachedTokens: number;
  completionTokens: number;
}

export interface CostBreakdown {
  priced: boolean;
  fallbackUsed: boolean;
  currency: CurrencyCode;
  inputPricePerM: number;
  cachedInputPricePerM: number;
  outputPricePerM: number;
  /** 模型原生货币成本 */
  costNative: number;
  costCny: number;
  costUsd: number;
  rateUsdCny: number;
}

export interface CostOptions {
  usdCnyRate: number;
  /** 未知模型兜底价（来自 PRICING_FALLBACK_* 环境变量） */
  fallback?: { input: number; output: number; currency: CurrencyCode };
}

const round8 = (x: number): number => Math.round(x * 1e8) / 1e8;

export function lookupPrice(
  model: string,
  fallback?: CostOptions['fallback'],
): ModelPrice | null {
  const hit = MODEL_PRICES[model];
  if (hit) return hit;
  if (fallback) {
    return {
      provider: 'DEEPSEEK', // 占位字段：兜底价不属于任何真实厂商，仅计价用
      currency: fallback.currency,
      input: fallback.input,
      cachedInput: 0,
      output: fallback.output,
    };
  }
  return null;
}

export function computeCost(
  model: string,
  usage: TokenUsage,
  opts: CostOptions,
): CostBreakdown {
  const price = lookupPrice(model, opts.fallback);
  const rate = opts.usdCnyRate;

  if (!price) {
    if (typeof console !== 'undefined') {
      console.warn(`[pricing] 未知模型 "${model}"：未配置兜底价，本条只计 token 不计价`);
    }
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

  // cachedTokens 上游偶发脏数据（> promptTokens）：收敛到安全区间
  const cached = Math.max(0, Math.min(usage.cachedTokens, usage.promptTokens));
  const missTokens = usage.promptTokens - cached;
  const cachedPrice = price.cachedInput > 0 ? price.cachedInput : price.input;

  const native =
    (missTokens * price.input + cached * cachedPrice + usage.completionTokens * price.output) / 1e6;

  const costNative = round8(native);
  const costCny = price.currency === 'CNY' ? costNative : round8(costNative * rate);
  const costUsd =
    price.currency === 'USD' ? costNative : rate > 0 ? round8(costNative / rate) : 0;

  return {
    priced: true,
    fallbackUsed: !MODEL_PRICES[model],
    currency: price.currency,
    inputPricePerM: price.input,
    cachedInputPricePerM: price.cachedInput,
    outputPricePerM: price.output,
    costNative,
    costCny,
    costUsd,
    rateUsdCny: rate,
  };
}
