'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '登录失败');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl shadow-slate-900/[0.06] backdrop-blur"
    >
      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
        管理密码
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm outline-none transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        placeholder="ADMIN_PASSWORD 环境变量设置的密码"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || password === ''}
        className="btn-primary mt-4 w-full py-2.5"
      >
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
