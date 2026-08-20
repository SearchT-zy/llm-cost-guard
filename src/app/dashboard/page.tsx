import { Suspense } from 'react';
import { Card, StatCard } from '@/components/ui/Card';
import { OverviewFilter } from '@/components/dashboard/OverviewFilter';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { BreakdownBarChart } from '@/components/charts/BreakdownBarChart';
import { getBreakdown, getTotals, getTrend } from '@/lib/query/stats';
import { fmtMoney, fmtTokens } from '@/lib/format';
import { PRICES_SNAPSHOT_DATE } from '@/lib/pricing/prices';
import { IconActivity, IconBars, IconCoins, IconInput, IconOutput, IconTrend } from '@/components/ui/icons';

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
    <div className="space-y-5">
      {/* 页头：标题 + 筛选器 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">成本概览</h1>
          <p className="mt-1 text-sm text-gray-500">
            最近 {days} 天 · 价格快照日期 {PRICES_SNAPSHOT_DATE}（价格会变动，见价格表文件头说明）
          </p>
        </div>
        <Suspense>
          <OverviewFilter />
        </Suspense>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="总消耗（双币种快照）"
          value={fmtMoney(totals.costCny, 'CNY')}
          sub={`≈ ${fmtMoney(totals.costUsd, 'USD')}（USD）`}
          icon={<IconCoins />}
          tone="indigo"
        />
        <StatCard
          label="调用次数"
          value={fmtTokens(totals.calls)}
          sub={totals.blockedCalls > 0 ? `含被熔断拦截 ${fmtTokens(totals.blockedCalls)} 次` : '无拦截'}
          icon={<IconActivity />}
          tone="sky"
        />
        <StatCard
          label="输入 tokens"
          value={fmtTokens(totals.promptTokens)}
          sub="缓存命中部分按折扣价计"
          icon={<IconInput />}
          tone="emerald"
        />
        <StatCard
          label="输出 tokens"
          value={fmtTokens(totals.completionTokens)}
          sub={
            totals.estimatedCalls > 0
              ? `${fmtTokens(totals.estimatedCalls)} 条为估算（±50%）`
              : '全部为上游精确值'
          }
          icon={<IconOutput />}
          tone="violet"
        />
      </div>

      {/* 趋势 */}
      <Card
        title={
          <>
            <IconTrend className="h-4 w-4 text-indigo-500" />
            消耗趋势
          </>
        }
        extra={
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              消耗
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-gray-400" />
              周期均值
            </span>
          </div>
        }
      >
        <TrendLineChart data={trend} metric={metric} currency={currency} />
      </Card>

      {/* 分组 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={
            <>
              <IconBars className="h-4 w-4 text-indigo-500" />
              按项目
            </>
          }
          extra={<span className="text-xs text-gray-400">{byProject.length} 个</span>}
        >
          <BreakdownBarChart items={byProject} currency={currency} />
        </Card>
        <Card
          title={
            <>
              <IconBars className="h-4 w-4 text-violet-500" />
              按模型
            </>
          }
          extra={<span className="text-xs text-gray-400">{byModel.length} 个</span>}
        >
          <BreakdownBarChart items={byModel} currency={currency} />
        </Card>
        <Card
          title={
            <>
              <IconBars className="h-4 w-4 text-sky-500" />
              按环境（测试 / 生产）
            </>
          }
          extra={<span className="text-xs text-gray-400">{byEnv.length} 类</span>}
        >
          <BreakdownBarChart items={byEnv} currency={currency} />
        </Card>
      </div>
    </div>
  );
}
