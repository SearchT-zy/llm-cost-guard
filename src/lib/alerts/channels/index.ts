import type { AlertType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getEnv } from '@/lib/env';
import { currentMonth } from '@/lib/gateway/budget';
import { budgetDedupKey, burstDedupKey } from '../dedupe';
import { formatAlert, type AlertContext } from '../format';
import { sendDingtalk } from './dingtalk';
import { sendEmail } from './email';
import { sendFeishu } from './feishu';

/**
 * 告警分发器：抢占式落 AlertEvent（唯一约束去重）→ 并发推送所有已配置渠道。
 *
 * - 单渠道失败只记入 detail，不影响其他渠道（Promise.allSettled）；
 * - 一个渠道都没配 → status = SKIPPED_NO_CHANNEL（后台可见"漏发"原因）；
 * - 任何异常都不向上抛（调用方在请求收尾链路里，不能因告警失败炸掉落库）。
 *
 * [SAAS] 闭源增值占位（仅注释，不实现）：
 * - 多渠道聚合去重（同源告警合并为一条多渠道通知）
 * - 告警升级（10 分钟未确认 → 升级下一级 / 短信 / 电话）
 * - 企业微信 / 短信渠道、值班轮转（OnCallSchedule）、静默期窗口
 */

export interface AlertInput {
  projectId: string;
  projectName: string;
  type: AlertType;
  spent?: number;
  budget?: number | null;
  currency?: 'CNY' | 'USD';
  detail?: string;
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
  );
}

export async function sendAlert(input: AlertInput): Promise<void> {
  const env = getEnv();
  const now = new Date();
  const month = currentMonth(now);

  const dedupKey =
    input.type === 'BURST'
      ? burstDedupKey(input.projectId, now)
      : budgetDedupKey(input.projectId, month, input.type);

  const ctx: AlertContext = {
    projectName: input.projectName,
    type: input.type,
    spent: input.spent,
    budget: input.budget,
    currency: input.currency,
    detail: input.detail,
  };
  const content = formatAlert(ctx);

  const jobs: Array<{ name: string; run: () => Promise<void> }> = [];
  if (env.alerts.dingtalk.webhookUrl && env.alerts.dingtalk.secret) {
    jobs.push({
      name: '钉钉',
      run: () =>
        sendDingtalk(
          env.alerts.dingtalk.webhookUrl,
          env.alerts.dingtalk.secret,
          content.title,
          content.markdown,
        ),
    });
  }
  if (env.alerts.feishu.webhookUrl && env.alerts.feishu.secret) {
    jobs.push({
      name: '飞书',
      run: () =>
        sendFeishu(
          env.alerts.feishu.webhookUrl,
          env.alerts.feishu.secret,
          content.title,
          content.text,
        ),
    });
  }
  if (env.alerts.smtp.host && env.alerts.smtp.to) {
    jobs.push({ name: '邮件', run: () => sendEmail(content.title, content.text) });
  }

  let status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CHANNEL' = 'SKIPPED_NO_CHANNEL';
  const results: string[] = [];

  if (jobs.length > 0) {
    const settled = await Promise.allSettled(jobs.map((j) => j.run()));
    settled.forEach((r, i) => {
      results.push(
        r.status === 'fulfilled'
          ? `${jobs[i].name}:ok`
          : `${jobs[i].name}:失败 ${String(r.reason).slice(0, 150)}`,
      );
    });
    status = settled.some((r) => r.status === 'fulfilled') ? 'SENT' : 'FAILED';
  }

  try {
    await prisma.alertEvent.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        dedupKey,
        status,
        detail: [input.detail, ...results].filter(Boolean).join(' | ') || null,
      },
    });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) return; // 本周期已发过 → 静默去重
    console.error('[alerts] AlertEvent 落库失败：', err);
  }
}
