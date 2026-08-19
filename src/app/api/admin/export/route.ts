import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseLogFilters, logWhere } from '@/lib/query/filters';
import { toCsvLine } from '@/lib/csv';

/**
 * CSV 报表导出（财务对账）。
 * - 与调用明细页共用同一套筛选条件（filters.ts 白名单）
 * - 流式输出：游标分批（5000/批）写入 ReadableStream，上限 10 万行
 * - BOM + CRLF，Excel 双击直接打开；双币种两列硬性在列
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 100_000;
const BATCH = 5000;

const HEADER = [
  '时间(UTC)', '项目', 'Provider', '模型', '流式', '状态', 'HTTP',
  '输入tokens', '缓存命中tokens', '输出tokens', '总tokens', '估算',
  '成本(CNY)', '成本(USD)', '原生货币', '输入价/1M', '输出价/1M', '汇率(USD→CNY)',
  '延迟ms', '首字ms', '错误摘要',
];

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseLogFilters(sp);
  const where = logWhere(filters);

  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  const names = new Map(projects.map((p) => [p.id, p.name]));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        // BOM (U+FEFF)：fromCharCode 生成，防编辑管线剥掉不可见字符
        controller.enqueue(enc.encode(String.fromCharCode(0xfeff) + toCsvLine(HEADER) + '\r\n'));
        let exported = 0;
        let cursor: string | null = null;

        while (exported < MAX_ROWS) {
          // 显式类型注解：游标条件展开会造成 rows 的循环类型推断
          const args: Parameters<typeof prisma.usageLog.findMany>[0] = {
            where,
            orderBy: { id: 'asc' as const },
            take: BATCH,
          };
          if (cursor) {
            args.skip = 1;
            args.cursor = { id: cursor };
          }
          const rows = await prisma.usageLog.findMany(args);
          if (rows.length === 0) break;
          cursor = rows[rows.length - 1].id;

          for (const r of rows) {
            controller.enqueue(
              enc.encode(
                toCsvLine([
                  r.createdAt.toISOString(),
                  names.get(r.projectId) ?? r.projectId,
                  r.provider,
                  r.model,
                  r.streaming ? '是' : '否',
                  r.status,
                  r.httpStatus ?? '',
                  r.promptTokens,
                  r.cachedTokens,
                  r.completionTokens,
                  r.totalTokens,
                  r.tokensEstimated ? '是' : '否',
                  r.costCny.toFixed(8),
                  r.costUsd.toFixed(8),
                  r.currency,
                  r.inputPricePerM.toString(),
                  r.outputPricePerM.toString(),
                  r.rateUsdCny.toString(),
                  r.latencyMs,
                  r.ttfbMs ?? '',
                  r.errorDetail ?? '',
                ]) + '\r\n',
              ),
            );
          }
          exported += rows.length;
          if (rows.length < BATCH) break;
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  const today = filters.toDay ?? new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="llm-cost-guard-usage-${today}.csv"`,
    },
  });
}
