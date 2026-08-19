'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BreakdownItemDto } from '@/lib/types/dto';
import { fmtMoney } from '@/lib/format';

/** 分组汇总横向条形图（项目 / 模型 / 环境），取 Top 8 */
export function BreakdownBarChart({
  items,
  currency = 'CNY',
}: {
  items: BreakdownItemDto[];
  currency?: 'CNY' | 'USD';
}) {
  const rows = items.slice(0, 8).map((i) => ({
    label: i.label.length > 14 ? `${i.label.slice(0, 13)}…` : i.label,
    value: currency === 'CNY' ? i.costCny : i.costUsd,
  }));

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">暂无数据</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
          <Tooltip
            formatter={(value) => [fmtMoney(Number(value ?? 0), currency), '消耗']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {rows.map((_, i) => (
              <Cell
                key={i}
                fill={[
                  '#2563eb',
                  '#0891b2',
                  '#7c3aed',
                  '#059669',
                  '#d97706',
                  '#dc2626',
                  '#db2777',
                  '#475569',
                ][i % 8]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
