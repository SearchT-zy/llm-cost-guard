import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * 后台守卫（Edge runtime —— 只依赖 Web Crypto，不引 Prisma / node:crypto）。
 *
 * - 已设 ADMIN_PASSWORD：校验签名 cookie；失败 → 页面 302 /login、API 401。
 * - 未设密码：后台仅允许本机访问（host 为回环且无外部 XFF 来源）。
 *   注：x-forwarded-for 仅在可信反代后有意义；任何公网部署都请设置 ADMIN_PASSWORD。
 * - /dashboard 的 layout 内还有 Node 侧二次验签（纵深防御）。
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (!LOCAL_HOSTS.has(host)) return false;
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return true;
  const firstIp = xff.split(',')[0].trim();
  return firstIp === '' || firstIp === '127.0.0.1' || firstIp === '::1';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 登录 / 登出接口自身不要求已登录
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  const isApi = pathname.startsWith('/api/');

  if (!adminPassword) {
    if (isLocalRequest(req)) return NextResponse.next();
    const msg = '未设置 ADMIN_PASSWORD，后台仅允许本机访问（公网部署请务必设置密码）';
    return isApi
      ? NextResponse.json({ error: msg }, { status: 403 })
      : new NextResponse(msg, { status: 403 });
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, adminPassword);
  if (session) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
