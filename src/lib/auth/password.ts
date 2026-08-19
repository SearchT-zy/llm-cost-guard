import crypto from 'node:crypto';

/**
 * 管理密码比对 + 登录限速（Node 侧专用，middleware 不引用本文件）。
 */

/** timing-safe 比对：先 sha256 定长摘要再比较，避免时序侧信道与长度泄漏 */
export function passwordMatches(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * 内存级登录限速：每 IP 每分钟 5 次。
 * 重启即清零 —— 单租户本地部署够用。
 * [SAAS] 闭源增值占位：持久化限速、IP 封锁策略、验证码。
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function loginRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) return false;
  return rec.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}
