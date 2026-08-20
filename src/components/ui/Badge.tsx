type Tone = 'green' | 'red' | 'amber' | 'gray' | 'blue' | 'indigo' | 'violet';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  SUCCESS: 'green',
  UPSTREAM_ERROR: 'red',
  CLIENT_ABORTED: 'amber',
  BLOCKED: 'gray',
  SENT: 'green',
  FAILED: 'red',
  SKIPPED_NO_CHANNEL: 'amber',
};

export function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    SUCCESS: '成功',
    UPSTREAM_ERROR: '上游错误',
    CLIENT_ABORTED: '客户端中断',
    BLOCKED: '已拦截',
    SENT: '已推送',
    FAILED: '推送失败',
    SKIPPED_NO_CHANNEL: '未配渠道',
  };
  return <Badge tone={STATUS_TONES[status] ?? 'gray'}>{label[status] ?? status}</Badge>;
}

export function EnvBadge({ env }: { env: string }) {
  return <Badge tone={env === 'PROD' ? 'blue' : 'gray'}>{env === 'PROD' ? '生产' : '测试'}</Badge>;
}
