import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/gateway/auth-key';
import { errors } from '@/lib/gateway/errors';

/**
 * GET /api/v1/models —— OpenAI 协议兼容的模型列表。
 * 返回本项目 allowedModels 白名单（每项目可见的模型不同）。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req.headers.get('authorization'));
  if (auth.kind === 'invalid') return errors.invalidApiKey();
  if (auth.kind === 'revoked') return errors.keyRevoked();

  return NextResponse.json({
    object: 'list',
    data: auth.project.allowedModels.map((id) => ({
      id,
      object: 'model',
      created: 0,
      owned_by: auth.project.provider.toLowerCase(),
    })),
  });
}
