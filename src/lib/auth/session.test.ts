import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from './session';

describe('会话签名', () => {
  it('签发 → 验签 roundtrip', async () => {
    const token = await signSession('secret-pw', 1);
    const payload = await verifySession(token, 'secret-pw');
    expect(payload).not.toBeNull();
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('过期 token 拒绝', async () => {
    const token = await signSession('secret-pw', 0);
    // ttl=0 → exp = now，立刻过期
    expect(await verifySession(token, 'secret-pw')).toBeNull();
  });

  it('篡改 payload 拒绝（签名不匹配）', async () => {
    const token = await signSession('secret-pw', 1);
    const [body, sig] = token.split('.');
    const forged = `${body.slice(0, -2)}xx.${sig}`;
    expect(await verifySession(forged, 'secret-pw')).toBeNull();
  });

  it('换密码后旧会话全部失效', async () => {
    const token = await signSession('old-pw', 1);
    expect(await verifySession(token, 'new-pw')).toBeNull();
  });

  it('空 token / 空密码直接拒绝', async () => {
    expect(await verifySession(undefined, 'pw')).toBeNull();
    expect(await verifySession('abc.def', '')).toBeNull();
  });
});
