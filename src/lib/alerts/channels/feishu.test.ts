import { describe, expect, it } from 'vitest';
import { dingtalkSign } from './dingtalk';
import { feishuSign } from './feishu';

describe('飞书签名', () => {
  it('★官方算法向量：HMAC-SHA256(key="ts\\nsecret", data="") 的 base64', () => {
    // secret='testsecret', timestamp=1700000000（秒级）
    // 向量独立计算后固定，防止与钉钉算法写反
    expect(feishuSign(1700000000, 'testsecret')).toBe(
      'AOc8oJ7//5OlQlfWC3nRL0R+IkuzcD1FKcAyibRK9Q8=',
    );
  });

  it('★与钉钉算法方向相反：同输入绝不产生相同签名', () => {
    // 钉钉：key=secret, data="ts\nsecret"（毫秒 ts）
    // 飞书：key="ts\nsecret", data=""（秒级 ts）
    // 若有人把两边的 key/data 写反，此用例会暴露
    const ding = dingtalkSign(1700000000000, 'testsecret');
    const fei = feishuSign(1700000000, 'testsecret');
    expect(ding).not.toBe(encodeURIComponent(fei));
  });

  it('不同 timestamp 签名不同', () => {
    expect(feishuSign(1, 's')).not.toBe(feishuSign(2, 's'));
  });
});
