'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BreakdownItemDto } from '@/lib/types/dto';
import { fmtMoney, fmtTokens } from '@/lib/format';

/** 分组汇总横向条形图（项目 / 模型 / 环境），取 Top 8，tooltip 含金额 / 占比 / 调用次数 */
const PALETTE = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#64748b'];

type Row = { label: string; value: number; calls: number; pct: number };

function BreakdownTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Row }>;
  currency: 'CNY' | 'USD';
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-slate-900/10 backdrop-blur">
      <div className="max-w-56 truncate text-xs font-medium text-gray-400">{row.label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
        {fmtMoney(row.value, currency)}
        <span className="ml-1.5 text-xs font-normal text-gray-400">占 {row.pct.toFixed(1)}%</span>
      </div>
      <div className="mt-0.5 text-xs tabular-nums text-gray-400">调用 {fmtTokens(row.calls)} 次</div>
    </div>
  );
}

export function BreakdownBarChart({
  items,
  currency = 'CNY',
}: {
  items: BreakdownItemDto[];
  currency?: 'CNY' | 'USD';
}) {
  const total = items.reduce((s, i) => s + (currency === 'CNY' ? i.costCny : i.costUsd), 0);
  const rows: Row[] = items.slice(0, 8).map((i) => {
    const value = currency === 'CNY' ? i.costCny : i.costUsd;
    return {
      label: i.label.length > 14 ? `${i.label.slice(0, 13)}…` : i.label,
      value,
      calls: i.calls,
      pct: total > 0 ? (value / total) * 100 : 0,
    };
  });

  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">暂无数据</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 20, bottom: 0, left: 8 }}
          barCategoryGap="30%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={110}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<BreakdownTooltip currency={currency} />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} animationDuration={600}>
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
