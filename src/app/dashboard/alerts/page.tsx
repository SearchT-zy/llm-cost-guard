import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TestAlertButton } from '@/components/alerts/TestAlertButton';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: '告警记录' };
export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, { label: string; tone: 'amber' | 'red' | 'blue' | 'gray' }> = {
  BUDGET_80: { label: '预算 80%', tone: 'amber' },
  BUDGET_100: { label: '预算 100%', tone: 'red' },
  BURST: { label: '消耗突增', tone: 'blue' },
};

export default async function AlertsPage() {
  const [events, projects] = await Promise.all([
    prisma.alertEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.project.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">告警记录</h1>
          <p className="text-xs text-gray-400">
            渠道（钉钉 / 飞书 / SMTP）在 .env 配置；未配渠道的事件显示"未配渠道"
          </p>
        </div>
        <TestAlertButton />
      </div>

      <Card>
        {events.length === 0 ? (
          <EmptyState text="暂无告警。配置告警渠道后，预算 80%/100% 与突增异常会推送并记录在这里。" />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">时间</th>
                  <th className="py-2 pr-3 font-medium">项目</th>
                  <th className="py-2 pr-3 font-medium">类型</th>
                  <th className="py-2 pr-3 font-medium">推送状态</th>
                  <th className="py-2 pr-3 font-medium">详情</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const t = TYPE_LABEL[e.type] ?? { label: e.type, tone: 'gray' as const };
                  return (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                        {fmtDateTime(e.createdAt.toISOString())}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {names.get(e.projectId ?? '') ?? (e.projectId ? '已删除项目' : '—')}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{e.detail ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
