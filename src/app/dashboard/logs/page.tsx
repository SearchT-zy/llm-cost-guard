import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getLogsPage } from '@/lib/query/stats';
import { parseLogFilters, type SearchParams } from '@/lib/query/filters';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { LogFilter } from '@/components/dashboard/LogFilter';
import { fmtDateTime, fmtMs, fmtMoney } from '@/lib/format';

export const metadata = { title: '调用明细' };
export const dynamic = 'force-dynamic';

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseLogFilters(sp);
  const [page, projects] = await Promise.all([
    getLogsPage(filters),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  // 导出链接带当前筛选条件
  const exportQuery = new URLSearchParams();
  if (filters.projectId) exportQuery.set('projectId', filters.projectId);
  if (filters.model) exportQuery.set('model', filters.model);
  if (filters.status) exportQuery.set('status', filters.status);
  if (filters.fromDay) exportQuery.set('from', filters.fromDay);
  if (filters.toDay) exportQuery.set('to', filters.toDay);

  const currentQuery = exportQuery.toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">调用明细</h1>
        <a
          href={`/api/admin/export?${currentQuery}`}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ⬇ 导出 CSV（当前筛选）
        </a>
      </div>

      <Card>
        <Suspense>
          <LogFilter projects={projects} />
        </Suspense>
      </Card>

      <Card>
        {page.items.length === 0 ? (
          <EmptyState text="暂无调用记录 —— 用项目虚拟 key（cgk_ 开头）请求 /api/v1/chat/completions 试试" />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">时间</th>
                  <th className="py-2 pr-3 font-medium">项目</th>
                  <th className="py-2 pr-3 font-medium">模型</th>
                  <th className="py-2 pr-3 font-medium">状态</th>
                  <th className="py-2 pr-3 text-right font-medium">输入</th>
                  <th className="py-2 pr-3 text-right font-medium">输出</th>
                  <th className="py-2 pr-3 text-right font-medium">成本 CNY</th>
                  <th className="py-2 pr-3 text-right font-medium">成本 USD</th>
                  <th className="py-2 pr-3 text-right font-medium">延迟</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{fmtDateTime(r.createdAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="mr-1">{r.projectName}</span>
                      {r.streaming && <Badge tone="blue">流式</Badge>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.model}
                      {r.tokensEstimated && (
                        <span title="上游未返回 usage，按字符粗估，误差 ±50%">
                          <Badge tone="amber">估算</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={r.status} />
                      {r.errorDetail && (
                        <div className="max-w-48 truncate text-xs text-gray-400" title={r.errorDetail}>
                          {r.errorDetail}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-600">
                      {r.promptTokens.toLocaleString('zh-CN')}
                      {r.cachedTokens > 0 && (
                        <span className="text-xs text-green-600">
                          {' '}
                          (缓存{r.cachedTokens.toLocaleString('zh-CN')})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-600">
                      {r.completionTokens.toLocaleString('zh-CN')}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.costCny, 'CNY')}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.costUsd, 'USD')}</td>
                    <td
                      className="py-2 pr-3 text-right whitespace-nowrap text-gray-500"
                      title={`首字 ${fmtMs(r.ttfbMs)}`}
                    >
                      {fmtMs(r.latencyMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page.page} pageSize={page.pageSize} total={page.total} query={currentQuery} />
      </Card>
    </div>
  );
}
