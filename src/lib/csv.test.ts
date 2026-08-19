import { describe, expect, it } from 'vitest';
import { csvEscape, toCsv } from './csv';

describe('CSV 序列化', () => {
  it('普通值原样输出', () => {
    expect(csvEscape('deepseek-chat')).toBe('deepseek-chat');
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('含逗号 / 引号 / 换行加引号并转义', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('他说"好"')).toBe('"他说""好"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('toCsv 带 BOM + CRLF + 表头', () => {
    const out = toCsv(['模型', '成本'], [['deepseek-chat', 1.5], ['a,b', null]]);
    // 用码点显式断言 BOM（字面量不可见字符可能被编辑器剥掉导致空断言）
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toContain('模型,成本');
    expect(out).toContain('"a,b"');
    expect(out.split('\r\n')).toHaveLength(4); // 表头 + 2 行 + 末尾换行
  });
});
