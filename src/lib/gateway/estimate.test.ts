import { describe, expect, it } from 'vitest';
import { estimateTokens, estimateTokensFromText, splitCharKinds } from './estimate';

describe('字符估算兜底', () => {
  it('纯 ASCII：默认 4 字符/token，向上取整', () => {
    expect(estimateTokensFromText('abcdefgh')).toBe(2); // 8/4
    expect(estimateTokensFromText('abc')).toBe(1); // ceil(3/4)
    expect(estimateTokensFromText('')).toBe(0);
  });

  it('纯中文：默认 1 字符/token', () => {
    expect(estimateTokensFromText('你好世界')).toBe(4);
  });

  it('混合文本分开计数', () => {
    expect(estimateTokensFromText('你好abc')).toBe(3); // 2 CJK + ceil(3/4)
  });

  it('splitCharKinds：非 ASCII（含 emoji）归入 CJK 类粗估', () => {
    const k = splitCharKinds('a你🎉b');
    expect(k.ascii).toBe(2);
    expect(k.cjk).toBe(2);
  });

  it('系数可调', () => {
    expect(estimateTokens(8, 0, 2, 1)).toBe(4);
    expect(estimateTokensFromText('你好', 4, 2)).toBe(1);
  });

  it('非法系数抛错', () => {
    expect(() => estimateTokens(1, 1, 0, 1)).toThrow(/正数/);
  });
});
