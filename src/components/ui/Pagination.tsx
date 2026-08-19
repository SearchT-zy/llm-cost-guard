import Link from 'next/link';

/** URL 参数驱动的分页（server component，无需 client JS） */
export function Pagination({
  page,
  pageSize,
  total,
  query,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** 当前页的完整查询串（不含 page），如 "projectId=p1&status=SUCCESS" */
  query: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => `/dashboard/logs?${query ? `${query}&` : ''}page=${p}`;
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) nums.push(i);

  const base = 'rounded-md border px-3 py-1.5 text-sm whitespace-nowrap';

  return (
    <nav className="flex items-center justify-between gap-2 overflow-x-auto py-3 text-sm">
      <span className="text-xs text-gray-500 whitespace-nowrap">
        共 {total.toLocaleString('zh-CN')} 条 · 第 {page}/{totalPages} 页
      </span>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className={`${base} border-gray-200 text-gray-600 hover:bg-gray-50`}
          >
            上一页
          </Link>
        ) : (
          <span className={`${base} border-gray-100 text-gray-300`}>上一页</span>
        )}
        {nums.map((n) => (
          <Link
            key={n}
            href={href(n)}
            className={
              n === page
                ? `${base} border-gray-900 bg-gray-900 text-white`
                : `${base} border-gray-200 text-gray-600 hover:bg-gray-50`
            }
          >
            {n}
          </Link>
        ))}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className={`${base} border-gray-200 text-gray-600 hover:bg-gray-50`}
          >
            下一页
          </Link>
        ) : (
          <span className={`${base} border-gray-100 text-gray-300`}>下一页</span>
        )}
      </div>
    </nav>
  );
}
