/**
 * CSV 序列化（RFC 4180）—— 财务对账导出。
 * - 前置 BOM（﻿）：Excel 直接双击打开中文不乱码
 * - 值含逗号 / 引号 / 换行时整体加引号，内部 " 转义为 ""
 */

export type CsvValue = string | number | null | undefined;

export function csvEscape(v: CsvValue): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsvLine(values: CsvValue[]): string {
  return values.map(csvEscape).join(',');
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [toCsvLine(header), ...rows.map(toCsvLine)];
  // BOM (U+FEFF)：用 fromCharCode 生成 —— 字面量/转义写法都可能被编辑管线剥掉
  return String.fromCharCode(0xfeff) + lines.join('\r\n') + '\r\n';
}
