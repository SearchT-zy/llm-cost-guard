import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/dashboard', label: '概览' },
  { href: '/dashboard/logs', label: '调用明细' },
  { href: '/dashboard/projects', label: '项目与密钥' },
  { href: '/dashboard/alerts', label: '告警记录' },
];

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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
              LCG
            </span>
            <span className="text-sm font-semibold">LLM-Cost-Guard</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <nav className="flex items-center gap-1 overflow-x-auto text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <LogoutButton enabled={Boolean(env.adminPassword)} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
