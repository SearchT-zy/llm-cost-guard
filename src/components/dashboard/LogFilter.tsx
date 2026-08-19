'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
    'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-gray-900';

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <select
        name="projectId"
        defaultValue={sp.get('projectId') ?? ''}
        className={input}
        aria-label="项目"
      >
        <option value="">全部项目</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        name="model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="模型名"
        className={input}
      />
      <select name="status" defaultValue={sp.get('status') ?? ''} className={input} aria-label="状态">
        <option value="">全部状态</option>
        <option value="SUCCESS">成功</option>
        <option value="UPSTREAM_ERROR">上游错误</option>
        <option value="CLIENT_ABORTED">客户端中断</option>
        <option value="BLOCKED">已拦截</option>
      </select>
      <input
        type="date"
        name="from"
        defaultValue={sp.get('from') ?? ''}
        className={input}
        aria-label="开始日期"
      />
      <input
        type="date"
        name="to"
        defaultValue={sp.get('to') ?? ''}
        className={input}
        aria-label="结束日期"
      />
      <div className="col-span-2 flex gap-2 sm:col-span-1">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          筛选
        </button>
        <button
          type="button"
          onClick={() => {
            setModel('');
            router.push('/dashboard/logs');
          }}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          重置
        </button>
      </div>
    </form>
  );
}
