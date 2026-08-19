'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPointDto } from '@/lib/types/dto';
import { fmtMoney, fmtTokensCompact } from '@/lib/format';

/**
 * 消耗趋势折线图（client component，只接收纯 DTO —— 规避 Recharts SSR/hydration 问题；
 * 切换 天/周/月 × 金额/token × CNY/USD 由服务端完成，本组件零状态零请求）。
 */

export function TrendLineChart({
  data,
  metric,
  currency,
}: {
  data: TrendPointDto[];
  metric: 'cost' | 'tokens';
  currency: 'CNY' | 'USD';
}) {
  const rows = data.map((d) => ({
    label: d.label,
    value:
      metric === 'cost'
        ? currency === 'CNY'
          ? d.costCny
          : d.costUsd
        : d.promptTokens + d.completionTokens,
  }));

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickMargin={8} />
          <YAxis
            tick={{ fontSize: 11 }}
            width={56}
            tickFormatter={(v: number) =>
              metric === 'cost'
                ? currency === 'CNY'
                  ? `¥${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                  : `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                : fmtTokensCompact(v)
            }
          />
          <Tooltip
            formatter={(value) =>
              metric === 'cost'
                ? [fmtMoney(Number(value ?? 0), currency), '消耗']
                : [fmtTokensCompact(Number(value ?? 0)), 'tokens']
            }
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
