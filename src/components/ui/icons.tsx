/**
 * 内联 SVG 图标（无第三方依赖；统一描边风格，与 indigo/violet 主题色配合）。
 * 尺寸由调用方 className 控制，默认 h-5 w-5。
 */

function Svg({
  children,
  className = 'h-5 w-5',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 金额 / 成本 */
export function IconCoins({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.3c-.5-1.2-1.6-2-2.8-2-1.8 0-3.2 1.3-3.2 3 0 4 6.4 2 6.4 5.7 0 1.7-1.4 3-3.2 3-1.3 0-2.5-.8-3-2.2" />
      <path d="M12 5.6v2.4M12 16v2.4" />
    </Svg>
  );
}

/** 调用次数 / 活动 */
export function IconActivity({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </Svg>
  );
}

/** 输入 tokens */
export function IconInput({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3v10" />
      <path d="M8 8l4 5 4-5" />
      <path d="M4 17h16" />
    </Svg>
  );
}

/** 输出 tokens */
export function IconOutput({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 13V3" />
      <path d="M8 8l4-5 4 5" />
      <path d="M4 17h16" />
    </Svg>
  );
}

/** 下载 / 导出 */
export function IconDownload({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Svg>
  );
}

/** 加号 */
export function IconPlus({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** 退出 */
export function IconLogout({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </Svg>
  );
}

/** 铃铛 / 告警 */
export function IconBell({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2.5 6.5H3.5C4.5 14.5 6 13 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

/** 趋势图 */
export function IconTrend({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 14l4-4 3 3 5-6" />
      <path d="M16 7h3v3" />
    </Svg>
  );
}

/** 分组条形 */
export function IconBars({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 20h18" />
      <path d="M6 20V12" />
      <path d="M11 20V5" />
      <path d="M16 20V9" />
      <path d="M21 20V3" />
    </Svg>
  );
}

/** 密钥 */
export function IconKey({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12L20 3" />
      <path d="M16.5 6.5l2 2" />
      <path d="M14 9l2 2" />
    </Svg>
  );
}

/** 下拉箭头（select 装饰用） */
export function IconChevronDown({ className }: { className?: string }) {
  return (
    <Svg className={className ?? 'h-3.5 w-3.5'}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
