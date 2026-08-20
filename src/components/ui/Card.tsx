import type { ReactNode } from 'react';

/** 通用卡片容器 */
export function Card({
  title,
  extra,
  children,
  className,
}: {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ${className ?? ''}`}>
      {(title || extra) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          {title && <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">{title}</h2>}
          {extra}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES = {
  indigo: {
    chip: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    glow: 'from-indigo-100/70',
    accent: 'text-indigo-600',
  },
  violet: {
    chip: 'bg-violet-50 text-violet-600 ring-violet-100',
    glow: 'from-violet-100/70',
    accent: 'text-violet-600',
  },
  sky: {
    chip: 'bg-sky-50 text-sky-600 ring-sky-100',
    glow: 'from-sky-100/70',
    accent: 'text-sky-600',
  },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    glow: 'from-emerald-100/70',
    accent: 'text-emerald-600',
  },
  amber: {
    chip: 'bg-amber-50 text-amber-600 ring-amber-100',
    glow: 'from-amber-100/70',
    accent: 'text-amber-600',
  },
} as const;

export type StatTone = keyof typeof TONES;

/** 统计卡：图标 + 大数字 + 注释，带悬停浮起与角落柔光 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'indigo',
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  valueClassName?: string;
}) {
  const t = TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/70 hover:shadow-card-hover">
      {/* 角落柔光装饰 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br to-transparent transition-transform duration-300 group-hover:scale-110 ${t.glow}`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${t.chip}`}>
            {icon}
          </span>
        )}
      </div>
      <div
        className={`relative mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-gray-900 ${valueClassName ?? ''}`}
      >
        {value}
      </div>
      {sub && <div className="relative mt-1.5 text-xs leading-relaxed text-gray-400">{sub}</div>}
    </div>
  );
}
