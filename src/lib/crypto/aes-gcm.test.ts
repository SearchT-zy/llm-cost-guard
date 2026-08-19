import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret, resolveKey } from './aes-gcm';

const KEY = Buffer.alloc(32, 7).toString('base64');

describe('AES-256-GCM 上游密钥加密', () => {
  it('加解密 roundtrip，密文格式 v1:<iv>:<tag>:<ct>', () => {
    const cipher = encryptSecret('sk-test-1234567890', KEY);
    expect(cipher.startsWith('v1:')).toBe(true);
    expect(cipher.split(':')).toHaveLength(4);
    expect(decryptSecret(cipher, KEY)).toBe('sk-test-1234567890');
  });

  it('同明文两次加密 IV 不同 → 密文不同', () => {
    expect(encryptSecret('sk-x', KEY)).not.toBe(encryptSecret('sk-x', KEY));
  });

  it('篡改密文抛错（GCM 完整性校验）', () => {
    const parts = encryptSecret('sk-test', KEY).split(':');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${Buffer.from('evil').toString('base64')}`;
    expect(() => decryptSecret(tampered, KEY)).toThrow(/解密失败/);
  });

  it('密钥长度错误抛出可操作提示', () => {
    expect(() => resolveKey(Buffer.alloc(16).toString('base64'))).toThrow(/ENCRYPTION_KEY/);
  });

  it('掩码：常规前 4 后 1，短串全遮', () => {
    expect(maskSecret('sk-abcd1234efghz')).toBe('sk-a***z');
    expect(maskSecret('short')).toBe('***');
  });
});
