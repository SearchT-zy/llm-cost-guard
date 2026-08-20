'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconBell } from '@/components/ui/icons';

/** 告警渠道连通性测试（钉钉 / 飞书 / SMTP 均已配置时各发一条；结果落告警记录） */
export function TestAlertButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onTest() {
    setLoading(true);
    try {
      await fetch('/api/admin/alerts/test', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={onTest} disabled={loading} className="btn-ghost self-start sm:self-auto">
      <IconBell className="h-4 w-4" />
      {loading ? '发送中…' : '发送测试告警'}
    </button>
  );
}
