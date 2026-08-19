import { describe, expect, it } from 'vitest';
import { shouldAlertBurst, type BurstConfig } from './anomaly';

const CFG: BurstConfig = { windowMinutes: 10, budgetRatio: 0.2, multiplier: 10, minCny: 1 };

describe('突增异常启发式', () => {
  it('窗口消耗达月预算 20% → 触发', () => {
    const r = shouldAlertBurst({ windowCost: 20, monthlyBudget: 100, trailingAvgPerWindow: 0.01, cfg: CFG });
    expect(r.alert).toBe(true);
    expect(r.reason).toContain('月预算');
  });

  it('窗口消耗达 24h 均值 10 倍 → 触发', () => {
    const r = shouldAlertBurst({ windowCost: 50, monthlyBudget: 10000, trailingAvgPerWindow: 5, cfg: CFG });
    // 预算阈值 2000 不满足，但均值阈值 5*10=50 满足
    expect(r.alert).toBe(true);
  });

  it('低于地板值不触发（防小额误报）', () => {
    const r = shouldAlertBurst({ windowCost: 0.5, monthlyBudget: 1, trailingAvgPerWindow: 0.001, cfg: CFG });
    expect(r.alert).toBe(false);
  });

  it('冷启动：无预算且无 24h 基线 → 不触发', () => {
    const r = shouldAlertBurst({ windowCost: 500, monthlyBudget: null, trailingAvgPerWindow: 0, cfg: CFG });
    expect(r.alert).toBe(false);
  });

  it('有预算但消耗低于两条阈值线 → 不触发', () => {
    // 预算 1000 → 阈值 200；均值 0.6 → 阈值 6。消耗 5：两条线都未达
    const r = shouldAlertBurst({ windowCost: 5, monthlyBudget: 1000, trailingAvgPerWindow: 0.6, cfg: CFG });
    expect(r.alert).toBe(false);
  });

  it('OR 语义：任一规则达标即触发（另一规则未达不拦截）', () => {
    // 预算 100 → 阈值 20；均值 10 → 阈值 100。消耗 50：过预算线但不过均值线 → 仍触发（预算规则）
    const r = shouldAlertBurst({ windowCost: 50, monthlyBudget: 100, trailingAvgPerWindow: 10, cfg: CFG });
    expect(r.alert).toBe(true);
    expect(r.reason).toContain('月预算');
  });
});
