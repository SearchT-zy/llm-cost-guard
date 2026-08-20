'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { IconChevronDown } from '@/components/ui/icons';

/** 调用明细筛选条：项目 / 模型 / 状态 / 日期范围（提交后写 URL，服务端重取） */
export function LogFilter({ projects }: { projects: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [model, setModel] = useState(sp.get('model') ?? '');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s) next.set(k, s);
    }
    next.delete('page'); // 重置页码
    router.push(`/dashboard/logs?${next.toString()}`);
  }

  const input =
    'h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm outline-none transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  const label = 'relative inline-flex w-full';

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:items-center">
      <label className={label}>
        <select name="projectId" defaultValue={sp.get('projectId') ?? ''} className={`${input} appearance-none pr-8`} aria-label="项目">
          <option value="">全部项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <IconChevronDown />
        </span>
      </label>
      <input
        name="model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="模型名"
        className={input}
      />
      <label className={label}>
        <select name="status" defaultValue={sp.get('status') ?? ''} className={`${input} appearance-none pr-8`} aria-label="状态">
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="UPSTREAM_ERROR">上游错误</option>
          <option value="CLIENT_ABORTED">客户端中断</option>
          <option value="BLOCKED">已拦截</option>
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <IconChevronDown />
        </span>
      </label>
      <input type="date" name="from" defaultValue={sp.get('from') ?? ''} className={input} aria-label="开始日期" />
      <input type="date" name="to" defaultValue={sp.get('to') ?? ''} className={input} aria-label="结束日期" />
      <div className="col-span-2 flex gap-2 md:col-span-1">
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]"
        >
          筛选
        </button>
        <button
          type="button"
          onClick={() => {
            setModel('');
            router.push('/dashboard/logs');
          }}
          className="btn-ghost h-9"
        >
          重置
        </button>
      </div>
    </form>
  );
}
