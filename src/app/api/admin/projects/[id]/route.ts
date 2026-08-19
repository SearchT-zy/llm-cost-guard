import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEnv } from '@/lib/env';
import { encryptSecret, maskSecret } from '@/lib/crypto/aes-gcm';
import { toProjectDto } from '@/lib/types/dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH：更新项目。upstreamKey 仅在显式传入非空值时重加密（留空 = 保持不变） */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const env = getEnv();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: '请求体无效' }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (body.environment === 'PROD' || body.environment === 'TEST') {
    data.environment = body.environment;
  }
  if (typeof body.baseUrl === 'string') data.baseUrl = body.baseUrl.trim() || null;
  if (Array.isArray(body.allowedModels)) {
    data.allowedModels = body.allowedModels.filter(
      (m): m is string => typeof m === 'string' && m.trim() !== '',
    );
  }
  if (typeof body.isEnabled === 'boolean') data.isEnabled = body.isEnabled;
  if (body.budgetCurrency === 'USD' || body.budgetCurrency === 'CNY') {
    data.budgetCurrency = body.budgetCurrency;
  }
  if (body.monthlyBudget === null || body.monthlyBudget === '') {
    data.monthlyBudget = null;
  } else if (body.monthlyBudget !== undefined) {
    const n = Number(body.monthlyBudget);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: '月度预算必须是 ≥0 的数字' }, { status: 400 });
    }
    data.monthlyBudget = n;
  }

  // 上游 key：传入非空字符串 = 更换（重新加密 + 新掩码）
  if (typeof body.upstreamKey === 'string' && body.upstreamKey.trim() !== '') {
    const plaintext = body.upstreamKey.trim();
    try {
      data.upstreamKeyEncrypted = encryptSecret(plaintext, env.encryptionKey);
      data.upstreamKeyMask = maskSecret(plaintext);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  try {
    const project = await prisma.project.update({
      where: { id },
      data,
      include: { keys: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json({ project: toProjectDto(project) });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    if (code === 'P2002') return NextResponse.json({ error: '项目名已存在' }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.project.delete({ where: { id } }); // 级联删除 keys / usageLogs / alertEvents
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
