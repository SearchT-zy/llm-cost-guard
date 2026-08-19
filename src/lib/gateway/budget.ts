import { prisma } from '@/lib/prisma';
import type { BudgetCurrency } from '@/generated/prisma';

/**
 * ★★★ 预算熔断 —— 技术限制（必读）★★★
 *
 * 1) 熔断只能"拒绝新请求"：检查发生在转发上游之前。正在流式输出中的请求
 *    无法被强行终止 —— 生成方在上游，本网关单方面断流只会让客户端收到截断
 *    的响应，而上游已生成的 token 照常计费。
 *    因此实际超支上界 ≈ 月预算 + 并发请求数 × 单请求最大成本。
 * 2) check-then-forward 非原子：N 个并发请求可能同时通过检查（软限流语义）。
 *    [SAAS] 闭源增值占位：两阶段预算预留表（reserve / confirm）可收紧上界，
 *    开源内核不实现。
 * 3) 每请求一次当月 Σ 聚合，走 (month, projectId) 索引，轻量场景（<1k QPS）足够；
 *    更高并发可用内存 / Redis 计数器缓存月累计（占位，不实现）。
 */

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function currentDay(now: Date = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 当月已消耗（按预算币种口径求和；BLOCKED / UPSTREAM_ERROR 的成本为 0，不影响结果） */
export async function monthSpend(
  projectId: string,
  currency: BudgetCurrency,
  month: string,
): Promise<number> {
  const agg = await prisma.usageLog.aggregate({
    _sum: { costCny: true, costUsd: true },
    where: { projectId, month },
  });
  return Number((currency === 'CNY' ? agg._sum.costCny : agg._sum.costUsd) ?? 0);
}

export interface BudgetCheck {
  blocked: boolean;
  budget: number | null;
  spent: number;
}

/** 转发前的熔断检查（新请求闸门） */
export async function checkBudgetGate(
  project: { id: string; monthlyBudget: number | null; budgetCurrency: BudgetCurrency },
): Promise<BudgetCheck> {
  if (project.monthlyBudget == null) {
    return { blocked: false, budget: null, spent: 0 };
  }
  const spent = await monthSpend(project.id, project.budgetCurrency, currentMonth());
  return { blocked: spent >= project.monthlyBudget, budget: project.monthlyBudget, spent };
}

/**
 * 阈值跨越判定（纯函数）：本条请求计入后，新越过的阈值列表。
 * prev < 80% ≤ now → BUDGET_80；prev < 100% ≤ now → BUDGET_100。
 */
export function crossedThresholds(
  prevSpent: number,
  newSpent: number,
  budget: number,
): Array<'BUDGET_80' | 'BUDGET_100'> {
  const out: Array<'BUDGET_80' | 'BUDGET_100'> = [];
  if (budget <= 0) return out;
  if (prevSpent < budget * 0.8 && newSpent >= budget * 0.8) out.push('BUDGET_80');
  if (prevSpent < budget && newSpent >= budget) out.push('BUDGET_100');
  return out;
}
