/**
 * 展示格式化（server / client 通用纯函数）。
 */

/** 金额：≥1 保留 2 位小数，小额保留 6 位（token 级计费常见几厘钱） */
export function fmtMoney(v: number, currency: 'CNY' | 'USD' = 'CNY'): string {
  const sym = currency === 'USD' ? '$' : '¥';
  const dec = Math.abs(v) >= 1 ? 2 : 6;
  return `${sym}${v.toFixed(dec)}`;
}

export function fmtTokens(v: number): string {
  return v.toLocaleString('zh-CN');
}

/** 紧凑 token：1.2万 / 3.4亿 */
export function fmtTokensCompact(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(1)}万`;
  return String(v);
}

/** ISO → "MM-DD HH:mm"（明细/告警列表用） */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}
