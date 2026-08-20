import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getLogsPage } from '@/lib/query/stats';
import { parseLogFilters, logWhere, type SearchParams } from '@/lib/query/filters';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { LogFilter } from '@/components/dashboard/LogFilter';
import { fmtDateTime, fmtMs, fmtMoney, fmtTokens } from '@/lib/format';
import { IconActivity, IconCoins, IconDownload, IconInput, IconOutput } from '@/components/ui/icons';

export const metadata = { title: '调用明细' };
export const dynamic = 'force-dynamic';

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseLogFilters(sp);
  const [page, projects, agg] = await Promise.all([
    getLogsPage(filters),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
    prisma.usageLog.aggregate({
      where: logWhere(filters),
      _sum: { costCny: true, costUsd: true, promptTokens: true, completionTokens: true },
    }),
  ]);

  const costCny = Number(agg._sum.costCny ?? 0);
  const costUsd = Number(agg._sum.costUsd ?? 0);
  const promptTokens = agg._sum.promptTokens ?? 0;
  const completionTokens = agg._sum.completionTokens ?? 0;

  // 导出链接带当前筛选条件
  const exportQuery = new URLSearchParams();
  if (filters.projectId) exportQuery.set('projectId', filters.projectId);
  if (filters.model) exportQuery.set('model', filters.model);
  if (filters.status) exportQuery.set('status', filters.status);
  if (filters.fromDay) exportQuery.set('from', filters.fromDay);
  if (filters.toDay) exportQuery.set('to', filters.toDay);

  const currentQuery = exportQuery.toString();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">调用明细</h1>
          <p className="mt-1 text-sm text-gray-500">按筛选条件查看每一次代理调用的计费与状态</p>
        </div>
        <a
          href={`/api/admin/export?${currentQuery}`}
          className="btn-primary self-start sm:self-auto"
        >
          <IconDownload className="h-4 w-4" />
          导出 CSV（当前筛选）
        </a>
      </div>

      {/* 筛选内汇总 */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="筛选内成本（CNY）"
          value={fmtMoney(costCny, 'CNY')}
          sub={`≈ ${fmtMoney(costUsd, 'USD')}（USD）`}
          icon={<IconCoins />}
          tone="indigo"
        />
        <StatCard
          label="记录条数"
          value={fmtTokens(page.total)}
          sub="含成功 / 错误 / 拦截"
          icon={<IconActivity />}
          tone="sky"
        />
        <StatCard label="输入 tokens 合计" value={fmtTokens(promptTokens)} icon={<IconInput />} tone="emerald" />
        <StatCard label="输出 tokens 合计" value={fmtTokens(completionTokens)} icon={<IconOutput />} tone="violet" />
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
          <div className="-mx-5 -mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">时间</th>
                  <th className="py-3 pr-3 font-medium">项目</th>
                  <th className="py-3 pr-3 font-medium">模型</th>
                  <th className="py-3 pr-3 font-medium">状态</th>
                  <th className="py-3 pr-3 text-right font-medium">输入</th>
                  <th className="py-3 pr-3 text-right font-medium">输出</th>
                  <th className="py-3 pr-3 text-right font-medium">成本 CNY</th>
                  <th className="py-3 pr-3 text-right font-medium">成本 USD</th>
                  <th className="py-3 pr-5 text-right font-medium">延迟</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 transition-colors last:border-0 hover:bg-indigo-50/30"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-gray-500">{fmtDateTime(r.createdAt)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="mr-1.5 font-medium text-gray-800">{r.projectName}</span>
                      {r.streaming && <Badge tone="indigo">流式</Badge>}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-gray-700">
                      {r.model}
                      {r.tokensEstimated && (
                        <span title="上游未返回 usage，按字符粗估，误差 ±50%">
                          <Badge tone="amber">估算</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={r.status} />
                      {r.errorDetail && (
                        <div className="max-w-48 truncate text-xs text-gray-400" title={r.errorDetail}>
                          {r.errorDetail}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-600">
                      {r.promptTokens.toLocaleString('zh-CN')}
                      {r.cachedTokens > 0 && (
                        <span className="text-xs text-emerald-600">
                          {' '}
                          (缓存{r.cachedTokens.toLocaleString('zh-CN')})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-600">
                      {r.completionTokens.toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums font-medium text-gray-900">
                      {fmtMoney(r.costCny, 'CNY')}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-700">{fmtMoney(r.costUsd, 'USD')}</td>
                    <td
                      className="py-3 pr-5 text-right whitespace-nowrap text-gray-500"
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
