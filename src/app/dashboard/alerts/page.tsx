import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TestAlertButton } from '@/components/alerts/TestAlertButton';
import { fmtDateTime } from '@/lib/format';
import { IconBell } from '@/components/ui/icons';

export const metadata = { title: '告警记录' };
export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, { label: string; tone: 'amber' | 'red' | 'indigo' | 'gray' }> = {
  BUDGET_80: { label: '预算 80%', tone: 'amber' },
  BUDGET_100: { label: '预算 100%', tone: 'red' },
  BURST: { label: '消耗突增', tone: 'indigo' },
};

export default async function AlertsPage() {
  const [events, projects] = await Promise.all([
    prisma.alertEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.project.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">告警记录</h1>
          <p className="mt-1 text-sm text-gray-500">
            渠道（钉钉 / 飞书 / SMTP）在 .env 配置；未配渠道的事件显示"未配渠道"
          </p>
        </div>
        <TestAlertButton />
      </div>

      <Card>
        {events.length === 0 ? (
          <EmptyState text="暂无告警。配置告警渠道后，预算 80%/100% 与突增异常会推送并记录在这里。" />
        ) : (
          <div className="-mx-5 -mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">时间</th>
                  <th className="py-3 pr-3 font-medium">项目</th>
                  <th className="py-3 pr-3 font-medium">类型</th>
                  <th className="py-3 pr-3 font-medium">推送状态</th>
                  <th className="py-3 pr-5 font-medium">详情</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const t = TYPE_LABEL[e.type] ?? { label: e.type, tone: 'gray' as const };
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-gray-50 transition-colors last:border-0 hover:bg-indigo-50/30"
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                        {fmtDateTime(e.createdAt.toISOString())}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap font-medium text-gray-800">
                        {names.get(e.projectId ?? '') ?? (e.projectId ? '已删除项目' : '—')}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="py-3 pr-5 text-xs leading-relaxed text-gray-500">{e.detail ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
        <IconBell className="h-3.5 w-3.5" />
        最多展示最近 200 条告警事件
      </p>
    </div>
  );
}
