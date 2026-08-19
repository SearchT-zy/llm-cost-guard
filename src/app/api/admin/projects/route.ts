import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEnv } from '@/lib/env';
import { encryptSecret, maskSecret } from '@/lib/crypto/aes-gcm';
import { generateVirtualKey } from '@/lib/gateway/auth-key';
import { toProjectDto } from '@/lib/types/dto';
import type { ProjectDto } from '@/lib/types/dto';

/**
 * 项目管理 API（受 middleware 保护）。
 *
 * ★安全约束：
 * - 上游 key 只接收明文一次（创建/更新时），立即 AES-256-GCM 加密落库；
 * - 任何响应只回 upstreamKeyMask 掩码，密文与明文都绝不外传。
 * - 创建项目时自动生成第一把虚拟 key：明文 apiKey 只在本响应出现一次。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROVIDERS = new Set(['DEEPSEEK', 'GLM', 'QWEN', 'OPENAI', 'CUSTOM']);

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'asc' },
    include: { keys: { orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ projects: projects.map(toProjectDto) });
}

interface ProjectCreateBody {
  name?: unknown;
  description?: unknown;
  environment?: unknown;
  provider?: unknown;
  baseUrl?: unknown;
  upstreamKey?: unknown;
  allowedModels?: unknown;
  monthlyBudget?: unknown;
  budgetCurrency?: unknown;
}

export async function POST(req: NextRequest) {
  const env = getEnv();
  const body = (await req.json().catch(() => null)) as ProjectCreateBody | null;

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const provider = typeof body?.provider === 'string' ? body.provider : '';
  const upstreamKey = typeof body?.upstreamKey === 'string' ? body.upstreamKey.trim() : '';
  const environment = body?.environment === 'PROD' ? 'PROD' : 'TEST';
  const budgetCurrency = body?.budgetCurrency === 'USD' ? 'USD' : 'CNY';
  const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl.trim() : '';
  const allowedModels = Array.isArray(body?.allowedModels)
    ? body.allowedModels
        .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
        .map((m) => m.trim())
    : [];
  const monthlyBudget =
    body?.monthlyBudget === null || body?.monthlyBudget === undefined || body?.monthlyBudget === ''
      ? null
      : Number(body.monthlyBudget);

  if (!name) return NextResponse.json({ error: '项目名不能为空' }, { status: 400 });
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: 'provider 必须是 DEEPSEEK/GLM/QWEN/OPENAI/CUSTOM 之一' },
      { status: 400 },
    );
  }
  if (provider === 'CUSTOM' && !baseUrl) {
    return NextResponse.json({ error: 'CUSTOM 项目必须填写上游 baseUrl' }, { status: 400 });
  }
  if (!upstreamKey) return NextResponse.json({ error: '上游 API Key 不能为空' }, { status: 400 });
  if (monthlyBudget !== null && (!Number.isFinite(monthlyBudget) || monthlyBudget < 0)) {
    return NextResponse.json({ error: '月度预算必须是 ≥0 的数字' }, { status: 400 });
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(upstreamKey, env.encryptionKey);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  try {
    const key = generateVirtualKey();
    const project = await prisma.project.create({
      data: {
        name,
        description:
          typeof body?.description === 'string' ? body.description.trim() || null : null,
        environment,
        provider: provider as ProjectDto['provider'],
        baseUrl: baseUrl || null,
        upstreamKeyEncrypted: encrypted,
        upstreamKeyMask: maskSecret(upstreamKey),
        allowedModels,
        monthlyBudget,
        budgetCurrency,
        keys: { create: { name: 'default', keyHash: key.keyHash, keyMask: key.keyMask } },
      },
      include: { keys: true },
    });

    // ★虚拟 key 明文：只在这里出现一次
    return NextResponse.json(
      { project: toProjectDto(project), apiKey: key.plaintext },
      { status: 201 },
    );
  } catch (err) {
    const msg =
      (err as { code?: string }).code === 'P2002' ? '项目名已存在' : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
