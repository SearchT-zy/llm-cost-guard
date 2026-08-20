'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { IconChevronDown } from '@/components/ui/icons';

/** 概览筛选条：时间范围 × 粒度（下拉）+ 指标 × 币种（分段按钮），写 URL searchParams，服务端重取数据 */
export function OverviewFilter() {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    next.set(key, value);
    router.push(`/dashboard?${next.toString()}`);
  }

  const select =
    'h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 shadow-sm outline-none transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  function PillSelect({
    name,
    value,
    aria,
    children,
  }: {
    name: string;
    value: string;
    aria: string;
    children: React.ReactNode;
  }) {
    return (
      <label className="relative inline-flex">
        <select className={select} value={value} onChange={(e) => update(name, e.target.value)} aria-label={aria}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <IconChevronDown />
        </span>
      </label>
    );
  }

  function Segmented({
    name,
    options,
    aria,
  }: {
    name: string;
    options: Array<{ value: string; label: string }>;
    aria: string;
  }) {
    const current = sp.get(name) ?? options[0].value;
    return (
      <div role="group" aria-label={aria} className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => update(name, o.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              current === o.value
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillSelect name="days" value={sp.get('days') ?? '30'} aria="时间范围">
        <option value="7">最近 7 天</option>
        <option value="30">最近 30 天</option>
        <option value="90">最近 90 天</option>
      </PillSelect>
      <PillSelect name="granularity" value={sp.get('granularity') ?? 'day'} aria="粒度">
        <option value="day">按天</option>
        <option value="week">按周</option>
        <option value="month">按月</option>
      </PillSelect>
      <Segmented
        name="metric"
        aria="指标"
        options={[
          { value: 'cost', label: '金额' },
          { value: 'tokens', label: 'Tokens' },
        ]}
      />
      <Segmented
        name="currency"
        aria="币种"
        options={[
          { value: 'CNY', label: '¥ CNY' },
          { value: 'USD', label: '$ USD' },
        ]}
      />
    </div>
  );
}
