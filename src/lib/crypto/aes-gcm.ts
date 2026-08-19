import crypto from 'node:crypto';

/**
 * 上游 API Key 的静态加密（AES-256-GCM）。
 *
 * - 密文格式 "v1:<iv>:<tag>:<ciphertext>"（均为 base64；版本前缀便于将来升级算法）
 * - 每次加密随机 12 字节 IV，同一明文每次密文不同
 * - 密钥来自环境变量 ENCRYPTION_KEY（32 字节 base64）。
 *   ★丢失或更换 ENCRYPTION_KEY = 已存密文不可恢复，请务必备份。
 * - ★安全约束：解密只发生在代理转发瞬间（内存中），任何 API / 页面只回显掩码。
 */

const VERSION = 'v1';

export function resolveKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY 无效：需要 32 字节 base64（当前解码后 ${key.length} 字节）。` +
        `生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string, keyBase64: string): string {
  const key = resolveKey(keyBase64);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptSecret(payload: string, keyBase64: string): string {
  const key = resolveKey(keyBase64);
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('密文格式无效（期望 v1:<iv>:<tag>:<ct>）—— 可能由更换 ENCRYPTION_KEY 或数据损坏导致');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // GCM 认证标签校验失败：密文被篡改，或密钥与加密时不一致
    throw new Error('解密失败：密文校验未通过（ENCRYPTION_KEY 不匹配或数据损坏）');
  }
}

/** 掩码预览：保留前 4 与后 1 字符；长度 ≤ 6 的短串整体打码，防止短 key 泄露 */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 6) return '***';
  return `${plaintext.slice(0, 4)}***${plaintext.slice(-1)}`;
}
