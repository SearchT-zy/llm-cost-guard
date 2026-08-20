'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconLogout } from '@/components/ui/icons';

export function LogoutButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (!enabled) return null;

  async function onLogout() {
    setLoading(true);
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <IconLogout className="h-3.5 w-3.5" />
      退出
    </button>
  );
}
