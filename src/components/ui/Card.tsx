export function Card({
  title,
  extra,
  children,
}: {
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {(title || extra) && (
        <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          {extra}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums text-gray-900 sm:text-2xl">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
