'use client';

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPointDto } from '@/lib/types/dto';
import { fmtMoney, fmtTokens, fmtTokensCompact } from '@/lib/format';

/**
 * 消耗趋势折线图（client component，只接收纯 DTO —— 规避 Recharts SSR/hydration 问题；
 * 切换 天/周/月 × 金额/token × CNY/USD 由服务端完成，本组件零状态零请求）。
 * 视觉：品牌渐变描边 + 渐变面积填充 + 虚线均值参考线 + 自定义悬浮卡。
 */

type Row = { label: string; value: number; calls: number };

function TrendTooltip({
  active,
  payload,
  label,
  metric,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Row }>;
  label?: string | number;
  metric: 'cost' | 'tokens';
  currency: 'CNY' | 'USD';
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-slate-900/10 backdrop-blur">
      <div className="text-xs font-medium text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
        {metric === 'cost' ? fmtMoney(row.value, currency) : `${fmtTokensCompact(row.value)} tokens`}
      </div>
      <div className="mt-0.5 text-xs tabular-nums text-gray-400">调用 {fmtTokens(row.calls)} 次</div>
    </div>
  );
}

export function TrendLineChart({
  data,
  metric,
  currency,
}: {
  data: TrendPointDto[];
  metric: 'cost' | 'tokens';
  currency: 'CNY' | 'USD';
}) {
  const rows: Row[] = data.map((d) => ({
    label: d.label,
    value:
      metric === 'cost'
        ? currency === 'CNY'
          ? d.costCny
          : d.costUsd
        : d.promptTokens + d.completionTokens,
    calls: d.calls,
  }));
  const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0;

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="trend-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            width={58}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              metric === 'cost'
                ? currency === 'CNY'
                  ? `¥${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                  : `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                : fmtTokensCompact(v)
            }
          />
          <Tooltip
            content={<TrendTooltip metric={metric} currency={currency} />}
            cursor={{ stroke: '#c7d2fe', strokeDasharray: '4 4' }}
          />
          {avg > 0 && (
            <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity={0.65} />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#trend-area)"
            isAnimationActive
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#trend-stroke)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#ffffff', fill: '#6366f1' }}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
