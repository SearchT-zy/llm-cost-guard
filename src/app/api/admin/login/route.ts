import { NextResponse, type NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';
import {
  clearLoginFailures,
  loginRateLimited,
  passwordMatches,
  recordLoginFailure,
} from '@/lib/auth/password';
import { SESSION_COOKIE, signSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const env = getEnv();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

  if (loginRateLimited(ip)) {
    return NextResponse.json({ error: '尝试过于频繁，请 1 分钟后再试' }, { status: 429 });
  }

  if (!env.adminPassword) {
    return NextResponse.json(
      { error: '未设置 ADMIN_PASSWORD（留空模式下无需登录，仅本机可访问后台）' },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!passwordMatches(password, env.adminPassword)) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  clearLoginFailures(ip);
  const token = await signSession(env.adminPassword, env.sessionTtlHours);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.sessionTtlHours * 3600,
  });
  return res;
}
