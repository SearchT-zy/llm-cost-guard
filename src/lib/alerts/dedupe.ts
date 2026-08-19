/**
 * 告警去重键。
 *
 * 去重机制 = AlertEvent.dedupKey 唯一约束：
 * 抢占式 create，撞唯一键（P2002）即说明本周期已发过，静默跳过 ——
 * 数据库层面天然并发安全，无需内存锁。
 *
 * - 预算阈值：每阈值每月一次（`${projectId}:${month}:BUDGET_80|BUDGET_100`）
 * - 突增：每小时一次冷却（`${projectId}:BURST:${yyyyMMddHH}`）
 */

export function budgetDedupKey(
  projectId: string,
  month: string,
  type: 'BUDGET_80' | 'BUDGET_100',
): string {
  return `${projectId}:${month}:${type}`;
}

export function burstDedupKey(projectId: string, at: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}${p(at.getHours())}`;
  return `${projectId}:BURST:${stamp}`;
}
