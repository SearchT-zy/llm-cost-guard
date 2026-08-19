import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/** 吊销虚拟 key（软删除：isEnabled=false，历史日志保留关联） */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; keyId: string }> },
) {
  const { keyId } = await ctx.params;
  try {
    await prisma.projectKey.update({
      where: { id: keyId },
      data: { isEnabled: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'key 不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
