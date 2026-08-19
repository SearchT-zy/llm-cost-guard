/**
 * searchParams → 查询条件（纯函数，白名单校验，防注入 / 防恶意分页）。
 */

export interface LogFilters {
  projectId?: string;
  model?: string;
  status?: 'SUCCESS' | 'UPSTREAM_ERROR' | 'CLIENT_ABORTED' | 'BLOCKED';
  fromDay?: string; // YYYY-MM-DD
  toDay?: string; // YYYY-MM-DD
  page: number;
  pageSize: number;
}

export type SearchParams = Record<string, string | string[] | undefined>;

function one(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s.trim() : undefined;
}

const STATUSES = new Set(['SUCCESS', 'UPSTREAM_ERROR', 'CLIENT_ABORTED', 'BLOCKED']);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseLogFilters(sp: SearchParams): LogFilters {
  const page = Math.max(1, Math.floor(Number(one(sp, 'page') ?? 1)) || 1);
  const pageSizeRaw = Math.floor(Number(one(sp, 'pageSize') ?? 50)) || 50;

  const fromDay = one(sp, 'from');
  const toDay = one(sp, 'to');
  const status = one(sp, 'status');

  return {
    projectId: one(sp, 'projectId'),
    model: one(sp, 'model')?.slice(0, 100),
    status: status && STATUSES.has(status) ? (status as LogFilters['status']) : undefined,
    fromDay: fromDay && DAY_RE.test(fromDay) ? fromDay : undefined,
    toDay: toDay && DAY_RE.test(toDay) ? toDay : undefined,
    page,
    pageSize: Math.min(200, Math.max(1, pageSizeRaw)),
  };
}

/** Prisma where（day 冗余列做日期范围，含 to 当天） */
export function logWhere(f: LogFilters) {
  const day: { gte?: string; lte?: string } = {};
  if (f.fromDay) day.gte = f.fromDay;
  if (f.toDay) day.lte = f.toDay;

  return {
    ...(f.projectId ? { projectId: f.projectId } : {}),
    ...(f.model ? { model: f.model } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(day.gte || day.lte ? { day } : {}),
  };
}
