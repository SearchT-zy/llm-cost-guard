import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVirtualKey } from '@/lib/gateway/auth-key';

/**
 * ★安全约束（硬性）：虚拟 key 明文只在本 POST 响应里出现一次；
 * 数据库只存 sha256 哈希，之后的任何接口 / 页面只回 keyMask。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name =
    typeof body?.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 50) : 'default';

  try {
    const key = generateVirtualKey();
    await prisma.projectKey.create({
      data: { projectId: id, name, keyHash: key.keyHash, keyMask: key.keyMask },
    });
    // ★明文仅此一次
    return NextResponse.json({ apiKey: key.plaintext, keyMask: key.keyMask }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2003') {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
