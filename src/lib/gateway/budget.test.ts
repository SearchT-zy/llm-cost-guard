import { describe, expect, it } from 'vitest';
import { crossedThresholds, currentDay, currentMonth } from './budget';

describe('预算阈值跨越判定', () => {
  it('跨 80% 触发 BUDGET_80', () => {
    expect(crossedThresholds(79, 81, 100)).toEqual(['BUDGET_80']);
  });

  it('一步跨过 80% 与 100% 时两个都触发', () => {
    expect(crossedThresholds(50, 120, 100)).toEqual(['BUDGET_80', 'BUDGET_100']);
  });

  it('只在 100% 线跨越时触发 BUDGET_100', () => {
    expect(crossedThresholds(85, 100, 100)).toEqual(['BUDGET_100']);
  });

  it('未越过任何阈值 / 已越过不再重复', () => {
    expect(crossedThresholds(10, 50, 100)).toEqual([]);
    expect(crossedThresholds(85, 90, 100)).toEqual([]); // 80% 早已越过
    expect(crossedThresholds(110, 130, 100)).toEqual([]); // 100% 早已越过
  });

  it('预算为 0 或负数不触发（防误报）', () => {
    expect(crossedThresholds(0, 10, 0)).toEqual([]);
  });

  it('currentMonth / currentDay 格式（月份补零）', () => {
    const d = new Date(2026, 7, 18, 10, 30); // 2026-08-18（月份 0 基）
    expect(currentMonth(d)).toBe('2026-08');
    expect(currentDay(d)).toBe('2026-08-18');
    const jan = new Date(2026, 0, 3);
    expect(currentMonth(jan)).toBe('2026-01');
    expect(currentDay(jan)).toBe('2026-01-03');
  });
});
