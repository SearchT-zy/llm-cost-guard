import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/dashboard/LogoutButton';
import { NavLinks } from '@/components/dashboard/NavLinks';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = getEnv();

  // Node 侧二次验签（middleware 之外再拦一道，纵深防御；未设密码时靠 middleware 的本机限制）
  if (env.adminPassword) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = await verifySession(token, env.adminPassword);
    if (!session) redirect('/login');
  }

  return (
    <div className="bg-page flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-white/85 shadow-sm shadow-slate-900/[0.02] backdrop-blur-md">
        {/* 顶部品牌渐变细线 */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="mx-auto flex max-w-7xl flex-col gap-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-[11px] font-bold text-white shadow-md shadow-indigo-500/30">
              LCG
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-gray-900">LLM-Cost-Guard</span>
              <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-100 sm:inline">
                成本审计网关
              </span>
            </span>
          </Link>
          <div className="flex items-center justify-between gap-4">
            <NavLinks />
            <LogoutButton enabled={Boolean(env.adminPassword)} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
        <p className="border-t border-gray-200/70 pt-4 text-center text-xs text-gray-400">
          LLM-Cost-Guard · 轻量化 LLM API 账单审计网关 · 数据仅存储于你的本地数据库
        </p>
      </footer>
    </div>
  );
}
