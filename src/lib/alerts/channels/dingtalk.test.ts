import { describe, expect, it } from 'vitest';
import { dingtalkSign } from './dingtalk';

describe('钉钉签名', () => {
  it('★官方算法向量：HMAC-SHA256(key=secret, data="ts\\nsecret") 的 base64', () => {
    // secret='testsecret', timestamp=1700000000000。向量由 node:crypto 独立计算后
    // 固定在测试里 —— 防止"key/data 写反"这类静默失败（写反会得到飞书算法的结果）
    expect(dingtalkSign(1700000000000, 'testsecret')).toBe(
      encodeURIComponent('d043yCasNZ+KC1N0lrVg+Aan0gEIKPvRfzRqMlUUwzk='),
    );
  });

  it('URL 编码 base64 特殊字符', () => {
    const sign = dingtalkSign(1700000000000, 'testsecret');
    expect(sign).not.toMatch(/[+/=]/); // + / = 均应被编码
  });

  it('不同 timestamp 签名不同', () => {
    expect(dingtalkSign(1, 's')).not.toBe(dingtalkSign(2, 's'));
  });
});
