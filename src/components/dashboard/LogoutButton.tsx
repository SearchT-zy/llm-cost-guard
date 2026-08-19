'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      className="whitespace-nowrap rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      退出
    </button>
  );
}
