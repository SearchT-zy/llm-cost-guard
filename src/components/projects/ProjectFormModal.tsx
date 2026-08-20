'use client';

import { useState } from 'react';
import type { ProjectDto } from '@/lib/types/dto';
import { knownModelsByProvider, type ProviderId } from '@/lib/pricing/prices';

const PROVIDER_OPTIONS: Array<{ value: ProviderId; label: string }> = [
  { value: 'DEEPSEEK', label: 'DeepSeek' },
  { value: 'GLM', label: '智谱 GLM' },
  { value: 'QWEN', label: '阿里 Qwen（百炼兼容模式）' },
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'CUSTOM', label: '自定义 OpenAI 兼容网关' },
];

/** 项目创建 / 编辑弹窗（编辑时上游 key 留空 = 保持不变） */
export function ProjectFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ProjectDto;
  onClose: () => void;
  /** 创建成功时回传一次性明文 key */
  onSaved: (apiKeyOnce?: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [environment, setEnvironment] = useState<'TEST' | 'PROD'>(initial?.environment ?? 'TEST');
  const [provider, setProvider] = useState<ProviderId>(
    (initial?.provider as ProviderId) ?? 'DEEPSEEK',
  );
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [upstreamKey, setUpstreamKey] = useState('');
  const [allowedModels, setAllowedModels] = useState((initial?.allowedModels ?? []).join(', '));
  const [monthlyBudget, setMonthlyBudget] = useState(
    initial?.monthlyBudget != null ? String(initial.monthlyBudget) : '',
  );
  const [budgetCurrency, setBudgetCurrency] = useState<'CNY' | 'USD'>(initial?.budgetCurrency ?? 'CNY');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name,
        description,
        environment,
        provider,
        baseUrl,
        allowedModels: allowedModels
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        monthlyBudget: monthlyBudget === '' ? null : Number(monthlyBudget),
        budgetCurrency,
      };
      if (upstreamKey.trim() !== '') payload.upstreamKey = upstreamKey.trim();

      const res = await fetch(initial ? `/api/admin/projects/${initial.id}` : '/api/admin/projects', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; apiKey?: string };
      if (!res.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      onSaved(data.apiKey);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }

  const input =
    'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
  const suggestions = knownModelsByProvider(provider);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-xl space-y-3 rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20">
        <h3 className="text-base font-semibold">{initial ? '编辑项目' : '新建项目'}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            项目名 <span className="text-red-500">*</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={input}
              placeholder="如：客服机器人"
            />
          </label>
          <label className="text-sm">
            环境标签（成本归因）
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as 'TEST' | 'PROD')}
              className={input}
            >
              <option value="TEST">测试</option>
              <option value="PROD">生产</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          描述
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={input}
            placeholder="选填"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            上游厂商 <span className="text-red-500">*</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className={input}
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {provider === 'CUSTOM' && (
            <label className="text-sm">
              上游 baseURL <span className="text-red-500">*</span>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                className={input}
                placeholder="http://localhost:9099/v1"
              />
            </label>
          )}
        </div>

        <label className="block text-sm">
          上游 API Key {initial ? '（留空 = 保持不变）' : <span className="text-red-500">*</span>}
          <input
            type="password"
            value={upstreamKey}
            onChange={(e) => setUpstreamKey(e.target.value)}
            required={!initial}
            className={input}
            placeholder={
              initial ? '••••••（已加密保存）' : 'sk-...（AES-256-GCM 加密存储，绝不回显明文）'
            }
          />
        </label>

        <label className="block text-sm">
          允许的模型（逗号 / 空格分隔，白名单外的模型请求返回 403）
          <input
            value={allowedModels}
            onChange={(e) => setAllowedModels(e.target.value)}
            className={input}
            placeholder="deepseek-chat, glm-4.6, mock-chat"
          />
        </label>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span>内置价格表模型：</span>
            {suggestions.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setAllowedModels((prev) =>
                    prev
                      .split(/[,，\s]+/)
                      .filter(Boolean)
                      .includes(m)
                      ? prev
                      : [...prev.split(/[,，\s]+/).filter(Boolean), m].join(', '),
                  )
                }
                className="rounded-full border border-gray-200 px-2 py-0.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                + {m}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            月度预算（留空 = 不限额，只统计不熔断）
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className={input}
              placeholder="如 100"
            />
          </label>
          <label className="text-sm">
            预算币种
            <select
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value as 'CNY' | 'USD')}
              className={input}
            >
              <option value="CNY">CNY ¥</option>
              <option value="USD">USD $</option>
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
