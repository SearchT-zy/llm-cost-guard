'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectDto } from '@/lib/types/dto';
import { PROVIDERS } from '@/lib/gateway/provider';
import { Badge, EnvBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { ApiKeyOnceDialog } from './ApiKeyOnceDialog';
import { ProjectFormModal } from './ProjectFormModal';

/** 项目与密钥管理（client：加载 /api/admin/projects，增删改后手动重载列表） */
export function ProjectsClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  const [editing, setEditing] = useState<ProjectDto | 'new' | null>(null);
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/projects');
    const data = (await res.json().catch(() => ({}))) as { projects?: ProjectDto[] };
    setProjects(data.projects ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey(projectId: string) {
    setBusy(projectId);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/keys`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { apiKey?: string; error?: string };
      if (data.apiKey) setApiKeyOnce(data.apiKey);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(projectId: string, keyId: string) {
    if (!confirm('确认吊销这把 key？使用它的客户端将立即收到 401。')) return;
    setBusy(keyId);
    try {
      await fetch(`/api/admin/projects/${projectId}/keys/${keyId}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function toggleEnabled(p: ProjectDto) {
    setBusy(p.id);
    try {
      await fetch(`/api/admin/projects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !p.isEnabled }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function removeProject(p: ProjectDto) {
    if (!confirm(`确认删除项目「${p.name}」？其调用明细与告警记录将一并删除。`)) return;
    setBusy(p.id);
    try {
      await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
      await load();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (projects === null) {
    return <p className="py-10 text-center text-sm text-gray-400">加载中…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">项目与密钥</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          ＋ 新建项目
        </button>
      </div>

      {projects.length === 0 && (
        <Card>
          <EmptyState text="还没有项目。新建一个项目，绑定你的厂商 API Key，就会生成 cgk_ 开头的代理虚拟 key。" />
        </Card>
      )}

      {projects.map((p) => (
        <Card key={p.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                <EnvBadge env={p.environment} />
                <Badge tone={p.isEnabled ? 'green' : 'gray'}>{p.isEnabled ? '启用' : '停用'}</Badge>
                <span className="text-xs text-gray-400">
                  {PROVIDERS[p.provider].label}
                  {p.provider === 'CUSTOM' && p.baseUrl ? ` · ${p.baseUrl}` : ''}
                </span>
              </div>
              {p.description && <p className="mt-1 text-sm text-gray-500">{p.description}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  月度预算：
                  {p.monthlyBudget != null
                    ? `${fmtMoney(p.monthlyBudget, p.budgetCurrency)}（达 80%/100% 告警，100% 后熔断新请求）`
                    : '不限额（只统计）'}
                </span>
                <span>上游 Key（加密存储）：{p.upstreamKeyMask}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.allowedModels.length === 0 ? (
                  <Badge tone="amber">未配置模型白名单（所有模型被拒）</Badge>
                ) : (
                  p.allowedModels.map((m) => <Badge key={m}>{m}</Badge>)
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => toggleEnabled(p)}
                disabled={busy === p.id}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {p.isEnabled ? '停用' : '启用'}
              </button>
              <button
                onClick={() => setEditing(p)}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                编辑
              </button>
              <button
                onClick={() => removeProject(p)}
                disabled={busy === p.id}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                删除
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500">
                代理虚拟 Key（cgk_ · 明文只在创建时显示一次）
              </h3>
              <button
                onClick={() => createKey(p.id)}
                disabled={busy === p.id}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ＋ 新建 Key
              </button>
            </div>
            <div className="space-y-1.5">
              {p.keys.length === 0 && <p className="text-xs text-gray-400">暂无 key</p>}
              {p.keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono">{k.keyMask}</span>
                  <span className="text-gray-400">{k.name}</span>
                  <span className="text-gray-400">
                    {k.lastUsedAt ? `最近使用 ${fmtDateTime(k.lastUsedAt)}` : '从未使用'}
                  </span>
                  {k.isEnabled ? (
                    <button
                      onClick={() => revokeKey(p.id, k.id)}
                      disabled={busy === k.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      吊销
                    </button>
                  ) : (
                    <Badge tone="gray">已吊销</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {editing && (
        <ProjectFormModal
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async (apiKey) => {
            setEditing(null);
            await load();
            router.refresh();
            if (apiKey) setApiKeyOnce(apiKey);
          }}
        />
      )}

      {apiKeyOnce && <ApiKeyOnceDialog apiKey={apiKeyOnce} onClose={() => setApiKeyOnce(null)} />}
    </div>
  );
}
