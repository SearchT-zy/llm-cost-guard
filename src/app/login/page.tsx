import { redirect } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { LoginForm } from '@/components/login/LoginForm';

export const metadata = { title: '登录' };
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const env = getEnv();
  // 未设密码（仅本机模式）无需登录，直接进后台
  if (!env.adminPassword) redirect('/dashboard');

  return (
    <main className="bg-page relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* 装饰光斑 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/20 via-violet-400/20 to-fuchsia-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/35">
            LCG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">LLM-Cost-Guard 控制台</h1>
          <p className="mt-1.5 text-sm text-gray-500">轻量化 LLM API 账单审计网关</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-gray-400">用量统计 · 成本审计 · 预算熔断 · 告警推送</p>
      </div>
    </main>
  );
}
