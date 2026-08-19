/**
 * 管理后台会话（单管理员，无账号系统）。
 *
 * - cookie 值格式：base64url(payload JSON) + "." + base64url(HMAC-SHA256 签名)
 * - 签名密钥：SHA-256(ADMIN_PASSWORD + ':cg-session-v1') —— 改密码 = 全部旧会话失效
 * - 使用 Web Crypto（crypto.subtle），Edge middleware 与 Node route handler 双端通用。
 *   ★middleware 跑在 Edge：严禁 import Prisma / node:crypto（本文件是唯一被
 *   middleware 引用的 auth 模块，保持零 Node 依赖）。
 */

export interface SessionPayload {
  iat: number; // 签发时间（秒）
  exp: number; // 过期时间（秒）
}

export const SESSION_COOKIE = 'cg_admin';

const encoder = new TextEncoder();

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(adminPassword: string): Promise<CryptoKey> {
  const seed = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${adminPassword}:cg-session-v1`),
  );
  return crypto.subtle.importKey('raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signSession(
  adminPassword: string,
  ttlHours: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { iat: now, exp: now + ttlHours * 3600 };
  const body = toB64url(encoder.encode(JSON.stringify(payload)));
  const key = await deriveKey(adminPassword);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${toB64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  adminPassword: string,
): Promise<SessionPayload | null> {
  if (!token || !adminPassword) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await deriveKey(adminPassword);
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      fromB64url(sig) as unknown as BufferSource,
      encoder.encode(body),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
