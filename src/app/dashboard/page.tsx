import { Suspense } from 'react';
import { Card, StatCard } from '@/components/ui/Card';
import { OverviewFilter } from '@/components/dashboard/OverviewFilter';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { BreakdownBarChart } from '@/components/charts/BreakdownBarChart';
import { getBreakdown, getTotals, getTrend } from '@/lib/query/stats';
import { fmtMoney, fmtTokens } from '@/lib/format';
import { PRICES_SNAPSHOT_DATE } from '@/lib/pricing/prices';

export const metadata = { title: '概览' };
export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

function one(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(one(sp, 'days'))) ? Number(one(sp, 'days')) : 30;
  const granularity =
    one(sp, 'granularity') === 'week' || one(sp, 'granularity') === 'month'
      ? (one(sp, 'granularity') as 'week' | 'month')
      : 'day';
  const metric = one(sp, 'metric') === 'tokens' ? 'tokens' : 'cost';
  const currency = one(sp, 'currency') === 'USD' ? 'USD' : 'CNY';

  const params = { days };
  const [trend, totals, byProject, byModel, byEnv] = await Promise.all([
    getTrend(params, granularity),
    getTotals(params),
    getBreakdown('project', params),
    getBreakdown('model', params),
    getBreakdown('environment', params),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">概览</h1>
          <p className="text-xs text-gray-400">
            最近 {days} 天 · 价格快照日期 {PRICES_SNAPSHOT_DATE}（价格会变动，见价格表文件头说明）
          </p>
        </div>
        <Suspense>
          <OverviewFilter />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="总消耗（双币种快照）"
          value={fmtMoney(totals.costCny, 'CNY')}
          sub={`≈ ${fmtMoney(totals.costUsd, 'USD')}`}
        />
        <StatCard
          label="调用次数"
          value={fmtTokens(totals.calls)}
          sub={totals.blockedCalls > 0 ? `含被熔断拦截 ${totals.blockedCalls} 次` : '无拦截'}
        />
        <StatCard label="输入 tokens" value={fmtTokens(totals.promptTokens)} sub="缓存命中部分按折扣价计" />
        <StatCard
          label="输出 tokens"
          value={fmtTokens(totals.completionTokens)}
          sub={totals.estimatedCalls > 0 ? `${totals.estimatedCalls} 条为估算（±50%）` : '全部为上游精确值'}
        />
      </div>

      <Card title="消耗趋势">
        <TrendLineChart data={trend} metric={metric} currency={currency} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="按项目">
          <BreakdownBarChart items={byProject} currency={currency} />
        </Card>
        <Card title="按模型">
          <BreakdownBarChart items={byModel} currency={currency} />
        </Card>
        <Card title="按环境（测试 / 生产）">
          <BreakdownBarChart items={byEnv} currency={currency} />
        </Card>
      </div>
    </div>
  );
}
