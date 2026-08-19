/**
 * ★★★ 内置模型价格表（开源内核）★★★
 *
 * - 单位统一为「每百万 token」，货币为模型官方原生货币（国内厂商 CNY，OpenAI USD）。
 * - 下表是 PRICES_SNAPSHOT_DATE 当日的人工快照。模型价格随时可能调整（厂商调价、
 *   促销、模型下线等），本表不保证实时准确，请以各官网价格页为准：
 *       DeepSeek  https://api-docs.deepseek.com/quick_start/pricing
 *       智谱 GLM  https://open.bigmodel.cn/pricing
 *       阿里 Qwen https://help.aliyun.com/zh/model-studio/models
 *       OpenAI    https://platform.openai.com/docs/pricing
 * - ★价格过时会导致成本统计偏差。欢迎提交 PR 更新本表（请附官网依据链接）。
 * - [SAAS] 闭源增值占位：云端价格库定时自动同步、新模型自动收录、租户级价格覆盖。
 *   开源版只能靠手动改这张表。
 * - 计价快照原则：每条 UsageLog 落库"当时"的单价，事后改本表不影响历史账单。
 * - cachedInput = 上下文缓存命中输入价（DeepSeek / OpenAI 有此折扣）；0 表示该
 *   厂商无缓存折扣，命中 token 按常规输入价计（见 cost.ts）。
 * - 表中未收录的模型：见 cost.ts 兜底策略（PRICING_FALLBACK_* 环境变量）。
 */

import type { CurrencyCode } from '../env';

/** CUSTOM = 自建网关，无内置价格（knownModelsByProvider 返回空，模型手填） */
export type ProviderId = 'DEEPSEEK' | 'GLM' | 'QWEN' | 'OPENAI' | 'CUSTOM';

export interface ModelPrice {
  provider: Exclude<ProviderId, 'CUSTOM'>;
  currency: CurrencyCode;
  /** 每百万 token：未命中缓存输入价 */
  input: number;
  /** 每百万 token：缓存命中输入价（无此折扣 = 0） */
  cachedInput: number;
  /** 每百万 token：输出价 */
  output: number;
}

export const PRICES_SNAPSHOT_DATE = '2026-08-18';

export const MODEL_PRICES: Record<string, ModelPrice> = {
  // ── DeepSeek（官方价，CNY）──────────────────────────────────────
  // V3.x 世代：chat 与 reasoner（思考模型）同表；缓存命中输入约为 1/4 价
  'deepseek-chat':     { provider: 'DEEPSEEK', currency: 'CNY', input: 2, cachedInput: 0.5, output: 3 },
  'deepseek-reasoner': { provider: 'DEEPSEEK', currency: 'CNY', input: 4, cachedInput: 1,   output: 3 },

  // ── 智谱 GLM（bigmodel.cn，CNY）────────────────────────────────
  'glm-4.6':       { provider: 'GLM', currency: 'CNY', input: 2,   cachedInput: 0, output: 8 },
  'glm-4.5':       { provider: 'GLM', currency: 'CNY', input: 2,   cachedInput: 0, output: 8 },
  'glm-4.5-air':   { provider: 'GLM', currency: 'CNY', input: 0.8, cachedInput: 0, output: 2 },
  'glm-4.5-flash': { provider: 'GLM', currency: 'CNY', input: 0,   cachedInput: 0, output: 0 }, // 免费档
  'glm-4-plus':    { provider: 'GLM', currency: 'CNY', input: 50,  cachedInput: 0, output: 50 },

  // ── 阿里 Qwen（百炼 dashscope，CNY）────────────────────────────
  'qwen3-max':  { provider: 'QWEN', currency: 'CNY', input: 2.4, cachedInput: 0, output: 9.6 },
  'qwen-max':   { provider: 'QWEN', currency: 'CNY', input: 1.2, cachedInput: 0, output: 6 },
  'qwen-plus':  { provider: 'QWEN', currency: 'CNY', input: 0.8, cachedInput: 0, output: 2 },
  'qwen-turbo': { provider: 'QWEN', currency: 'CNY', input: 0.3, cachedInput: 0, output: 0.6 },

  // ── OpenAI（platform.openai.com，USD）──────────────────────────
  // cachedInput 为官方 prompt caching 自动折扣价
  'gpt-4o':       { provider: 'OPENAI', currency: 'USD', input: 2.5,  cachedInput: 1.25,  output: 10 },
  'gpt-4o-mini':  { provider: 'OPENAI', currency: 'USD', input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4.1':      { provider: 'OPENAI', currency: 'USD', input: 2,    cachedInput: 0.5,   output: 8 },
  'gpt-4.1-mini': { provider: 'OPENAI', currency: 'USD', input: 0.4,  cachedInput: 0.04,  output: 1.6 },
  'gpt-4.1-nano': { provider: 'OPENAI', currency: 'USD', input: 0.1,  cachedInput: 0.025, output: 0.4 },
  'gpt-5':        { provider: 'OPENAI', currency: 'USD', input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5-mini':   { provider: 'OPENAI', currency: 'USD', input: 0.25, cachedInput: 0.025, output: 2 },
  'gpt-5-nano':   { provider: 'OPENAI', currency: 'USD', input: 0.05, cachedInput: 0.005, output: 0.4 },
};

/** 创建项目表单用：某 provider 下的已知模型列表（自定义模型仍可手填） */
export function knownModelsByProvider(provider: ProviderId): string[] {
  return Object.entries(MODEL_PRICES)
    .filter(([, p]) => p.provider === provider)
    .map(([id]) => id);
}
