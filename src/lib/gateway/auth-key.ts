import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * 项目代理虚拟 API Key（cgk_ 前缀）。
 *
 * ★安全约束：
 * - 明文 key 只在「创建 key」的响应里出现一次；
 * - 数据库仅存 sha256 哈希（keyHash 唯一索引反查），绝不存明文；
 * - 页面 / API 回显一律用 keyMask。
 */

export const KEY_PREFIX = 'cgk_';

export function hashKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function maskKey(plaintext: string): string {
  return `${plaintext.slice(0, 8)}…${plaintext.slice(-4)}`;
}

export function generateVirtualKey(): { plaintext: string; keyHash: string; keyMask: string } {
  const plaintext = KEY_PREFIX + crypto.randomBytes(24).toString('base64url');
  return { plaintext, keyHash: hashKey(plaintext), keyMask: maskKey(plaintext) };
}

export type KeyResolution =
  | { kind: 'invalid' }
  | { kind: 'revoked' }
  | {
      kind: 'ok';
      keyId: string;
      project: {
        id: string;
        name: string;
        provider: 'DEEPSEEK' | 'GLM' | 'QWEN' | 'OPENAI' | 'CUSTOM';
        baseUrl: string | null;
        upstreamKeyEncrypted: string;
        allowedModels: string[];
        monthlyBudget: number | null;
        budgetCurrency: 'CNY' | 'USD';
      };
    };

export async function resolveApiKey(authorization: string | null): Promise<KeyResolution> {
  if (!authorization?.startsWith('Bearer ')) return { kind: 'invalid' };
  const plaintext = authorization.slice(7).trim();
  if (!plaintext.startsWith(KEY_PREFIX) || plaintext.length <= KEY_PREFIX.length) {
    return { kind: 'invalid' };
  }

  const row = await prisma.projectKey.findUnique({
    where: { keyHash: hashKey(plaintext) },
    include: { project: true },
  });
  if (!row) return { kind: 'invalid' };
  if (!row.isEnabled || !row.project.isEnabled) return { kind: 'revoked' };

  // 异步刷新 lastUsedAt，不阻塞请求（失败静默）
  void prisma.projectKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    kind: 'ok',
    keyId: row.id,
    project: {
      id: row.project.id,
      name: row.project.name,
      provider: row.project.provider,
      baseUrl: row.project.baseUrl,
      upstreamKeyEncrypted: row.project.upstreamKeyEncrypted,
      allowedModels: row.project.allowedModels,
      monthlyBudget:
        row.project.monthlyBudget == null ? null : Number(row.project.monthlyBudget),
      budgetCurrency: row.project.budgetCurrency,
    },
  };
}
