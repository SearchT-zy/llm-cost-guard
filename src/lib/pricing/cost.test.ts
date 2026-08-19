import { describe, expect, it } from 'vitest';
import { computeCost } from './cost';

const RATE = { usdCnyRate: 7.2 };

describe('computeCost 双币种成本计算', () => {
  it('DeepSeek：缓存命中/未命中输入价拆分 + CNY 计价', () => {
    // deepseek-chat: 2(未命中)/0.5(命中)/3 CNY 每百万
    const r = computeCost(
      'deepseek-chat',
      { promptTokens: 1_000_000, cachedTokens: 400_000, completionTokens: 200_000 },
      RATE,
    );
    // (600000*2 + 400000*0.5 + 200000*3) / 1e6 = 2.0
    expect(r.priced).toBe(true);
    expect(r.fallbackUsed).toBe(false);
    expect(r.currency).toBe('CNY');
    expect(r.costNative).toBe(2);
    expect(r.costCny).toBe(2);
    expect(r.costUsd).toBeCloseTo(2 / 7.2, 8);
  });

  it('OpenAI：USD 模型按汇率快照换算 CNY', () => {
    // gpt-4o-mini: 0.15/0.075/0.6 USD 每百万
    const r = computeCost(
      'gpt-4o-mini',
      { promptTokens: 1_000_000, cachedTokens: 0, completionTokens: 1_000_000 },
      RATE,
    );
    expect(r.currency).toBe('USD');
    expect(r.costNative).toBe(0.75);
    expect(r.costUsd).toBe(0.75);
    expect(r.costCny).toBeCloseTo(5.4, 8);
  });

  it('未知模型：未配兜底 → 只计 token 不计价（priced=false）', () => {
    const r = computeCost(
      'who-am-i-model',
      { promptTokens: 100, cachedTokens: 0, completionTokens: 50 },
      RATE,
    );
    expect(r.priced).toBe(false);
    expect(r.costCny).toBe(0);
    expect(r.costUsd).toBe(0);
  });

  it('未知模型：配兜底价 → 按兜底计价并标记 fallbackUsed', () => {
    const r = computeCost(
      'who-am-i-model',
      { promptTokens: 2_000_000, cachedTokens: 0, completionTokens: 1_000_000 },
      { usdCnyRate: 7.2, fallback: { input: 1, output: 2, currency: 'CNY' } },
    );
    expect(r.priced).toBe(true);
    expect(r.fallbackUsed).toBe(true);
    expect(r.costCny).toBe(4);
  });

  it('无缓存折扣的模型（cachedInput=0）：命中 token 按常规输入价计，不少算', () => {
    // glm-4.5: input 2 / cachedInput 0 / output 8
    const r = computeCost(
      'glm-4.5',
      { promptTokens: 1_000_000, cachedTokens: 500_000, completionTokens: 0 },
      RATE,
    );
    expect(r.costCny).toBe(2);
  });

  it('cachedTokens 超过 promptTokens 的脏数据被收敛', () => {
    const r = computeCost(
      'deepseek-chat',
      { promptTokens: 100, cachedTokens: 500, completionTokens: 0 },
      RATE,
    );
    // 100 token 全部按命中价 0.5 计
    expect(r.costCny).toBeCloseTo((100 * 0.5) / 1e6, 10);
  });

  it('免费模型（glm-4.5-flash）成本为 0 但 priced=true', () => {
    const r = computeCost(
      'glm-4.5-flash',
      { promptTokens: 1000, cachedTokens: 0, completionTokens: 1000 },
      RATE,
    );
    expect(r.priced).toBe(true);
    expect(r.costCny).toBe(0);
  });
});
