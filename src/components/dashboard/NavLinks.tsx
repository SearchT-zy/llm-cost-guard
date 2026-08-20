'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: '概览' },
  { href: '/dashboard/logs', label: '调用明细' },
  { href: '/dashboard/projects', label: '项目与密钥' },
  { href: '/dashboard/alerts', label: '告警记录' },
];

/** 顶部导航（client：根据当前路径高亮激活项） */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm" aria-label="主导航">
      {NAV.map((item) => {
        const active =
          item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
              active
                ? 'bg-indigo-50 font-medium text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
