'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/** 概览筛选条：时间范围 × 粒度 × 指标 × 币种（写 URL searchParams，服务端重取数据） */
export function OverviewFilter() {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    next.set(key, value);
    router.push(`/dashboard?${next.toString()}`);
  }

  const select =
    'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-gray-900';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={select}
        value={sp.get('days') ?? '30'}
        onChange={(e) => update('days', e.target.value)}
        aria-label="时间范围"
      >
        <option value="7">最近 7 天</option>
        <option value="30">最近 30 天</option>
        <option value="90">最近 90 天</option>
      </select>
      <select
        className={select}
        value={sp.get('granularity') ?? 'day'}
        onChange={(e) => update('granularity', e.target.value)}
        aria-label="粒度"
      >
        <option value="day">按天</option>
        <option value="week">按周</option>
        <option value="month">按月</option>
      </select>
      <select
        className={select}
        value={sp.get('metric') ?? 'cost'}
        onChange={(e) => update('metric', e.target.value)}
        aria-label="指标"
      >
        <option value="cost">金额</option>
        <option value="tokens">tokens</option>
      </select>
      <select
        className={select}
        value={sp.get('currency') ?? 'CNY'}
        onChange={(e) => update('currency', e.target.value)}
        aria-label="币种"
      >
        <option value="CNY">CNY ¥</option>
        <option value="USD">USD $</option>
      </select>
    </div>
  );
}
