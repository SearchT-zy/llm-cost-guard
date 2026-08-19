/**
 * 本地演示数据（可选执行：npm run db:seed）
 *
 * 生成内容：
 * - 1 个示例项目（CUSTOM 上游指向本地 mock：http://localhost:9099/v1，key=sk-mock）
 * - 1 把固定的演示虚拟 key（明文打印在末尾，方便直接 curl）
 * - 最近 14 天的模拟调用明细（真实价格快照计价，图表/导出立即可看）
 *
 * 注意：seed 只造"已计费"的演示行；真实调用请启动 scripts/mock-upstream.mjs 联调。
 */

import { PrismaClient } from '../src/generated/prisma/index';
import { computeCost } from '../src/lib/pricing/cost';
import { encryptSecret, maskSecret } from '../src/lib/crypto/aes-gcm';
import { hashKey } from '../src/lib/gateway/auth-key';

// 独立脚本不吃 Next 的 .env 加载，手动读一次（Node 22+）
try {
  process.loadEnvFile?.();
} catch {
  /* .env 不存在时忽略 */
}

const prisma = new PrismaClient();

const DEMO_KEY = 'cgk_seed_demo_000000000000000000';
const MODELS = ['deepseek-chat', 'glm-4.5', 'gpt-4o-mini', 'qwen-plus'];

function dayMonth(d: Date): [string, string] {
  const p = (n: number) => String(n).padStart(2, '0');
  return [
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    `${d.getFullYear()}-${p(d.getMonth() + 1)}`,
  ];
}

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('缺少 ENCRYPTION_KEY，请先在 .env 配置（生成：node scripts/gen-encryption-key.mjs）');
  }
  const rate = Number(process.env.USD_CNY_RATE ?? 7.2);

  const existing = await prisma.project.findUnique({ where: { name: 'demo-mock' } });
  if (existing) {
    console.log('示例项目已存在，跳过 seed（如需重来：先在后台删除项目）');
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: 'demo-mock',
      description: '演示项目：上游指向本地 mock（scripts/mock-upstream.mjs）',
      environment: 'PROD',
      provider: 'CUSTOM',
      baseUrl: 'http://localhost:9099/v1',
      upstreamKeyEncrypted: encryptSecret('sk-mock', encryptionKey),
      upstreamKeyMask: maskSecret('sk-mock'),
      allowedModels: [...MODELS, 'mock-chat'],
      monthlyBudget: 100,
      budgetCurrency: 'CNY',
      keys: {
        create: {
          name: 'seed-demo',
          keyHash: hashKey(DEMO_KEY),
          keyMask: `${DEMO_KEY.slice(0, 8)}…${DEMO_KEY.slice(-4)}`,
        },
      },
    },
    include: { keys: true },
  });

  // 最近 14 天、每天 3~12 条演示调用
  const now = new Date();
  let created = 0;
  for (let d = 13; d >= 0; d--) {
    const when = new Date(now.getTime() - d * 24 * 60 * 60_000);
    const [day, month] = dayMonth(when);
    const count = 3 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const model = MODELS[Math.floor(Math.random() * MODELS.length)];
      const promptTokens = 200 + Math.floor(Math.random() * 4000);
      const completionTokens = 100 + Math.floor(Math.random() * 2000);
      const cachedTokens = model.startsWith('deepseek') ? Math.floor(promptTokens * 0.3) : 0;
      const cost = computeCost(
        model,
        { promptTokens, cachedTokens, completionTokens },
        { usdCnyRate: rate },
      );
      const createdAt = new Date(when.getTime() + Math.floor(Math.random() * 20 * 3600_000));
      await prisma.usageLog.create({
        data: {
          projectId: project.id,
          keyId: project.keys[0]?.id ?? null,
          provider:
            cost.currency === 'USD'
              ? 'OPENAI'
              : model.startsWith('glm')
                ? 'GLM'
                : model.startsWith('qwen')
                  ? 'QWEN'
                  : 'DEEPSEEK',
          model,
          streaming: Math.random() > 0.4,
          status: 'SUCCESS',
          httpStatus: 200,
          promptTokens,
          cachedTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          tokensEstimated: false,
          currency: cost.currency,
          inputPricePerM: cost.inputPricePerM,
          cachedInputPricePerM: cost.cachedInputPricePerM,
          outputPricePerM: cost.outputPricePerM,
          costCny: cost.costCny,
          costUsd: cost.costUsd,
          rateUsdCny: cost.rateUsdCny,
          latencyMs: 300 + Math.floor(Math.random() * 5000),
          ttfbMs: 100 + Math.floor(Math.random() * 1500),
          day,
          month,
          createdAt,
        },
      });
      created++;
    }
  }

  console.log(`✓ 示例项目 demo-mock 创建完成，写入 ${created} 条演示调用`);
  console.log(`\n演示虚拟 key（仅 seed 打印这一次）：\n  ${DEMO_KEY}\n`);
  console.log('联调步骤：');
  console.log('  1) node scripts/mock-upstream.mjs');
  console.log(
    `  2) curl -s localhost:3000/api/v1/chat/completions -H "Authorization: Bearer ${DEMO_KEY}" \\`,
  );
  console.log(
    '       -H "Content-Type: application/json" -d \'{"model":"mock-chat","messages":[{"role":"user","content":"hi"}]}\'',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
