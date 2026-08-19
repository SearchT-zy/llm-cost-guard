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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl font-bold text-white">
            LCG
          </div>
          <h1 className="text-xl font-semibold">LLM-Cost-Guard 控制台</h1>
          <p className="mt-1 text-sm text-gray-500">轻量化 LLM API 账单审计网关</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
