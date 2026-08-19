/**
 * 告警文案模板（邮件 text / 钉钉 markdown / 飞书 text 共用一套正文）。
 */

export interface AlertContent {
  title: string;
  /** 纯文本正文（邮件 + 飞书） */
  text: string;
  /** markdown 正文（钉钉） */
  markdown: string;
}

export interface AlertContext {
  projectName: string;
  type: 'BUDGET_80' | 'BUDGET_100' | 'BURST';
  spent?: number;
  budget?: number | null;
  currency?: 'CNY' | 'USD';
  detail?: string;
}

const TYPE_LABEL: Record<AlertContext['type'], string> = {
  BUDGET_80: '预算 80% 预警',
  BUDGET_100: '预算已耗尽（100%）',
  BURST: '短时消耗突增',
};

function fmtMoney(v: number, currency: 'CNY' | 'USD' = 'CNY'): string {
  return currency === 'USD' ? `$${v.toFixed(2)}` : `¥${v.toFixed(2)}`;
}

export function formatAlert(ctx: AlertContext): AlertContent {
  const label = TYPE_LABEL[ctx.type];
  const title = `【LLM-Cost-Guard】${ctx.projectName} · ${label}`;
  const lines: string[] = [`项目：${ctx.projectName}`, `事件：${label}`];

  if (ctx.type !== 'BURST' && ctx.spent != null && ctx.budget != null) {
    const pct = ctx.budget > 0 ? Math.round((ctx.spent / ctx.budget) * 100) : 0;
    lines.push(
      `当月消耗：${fmtMoney(ctx.spent, ctx.currency)} / 预算 ${fmtMoney(ctx.budget, ctx.currency)}（${pct}%）`,
    );
    if (ctx.type === 'BUDGET_100') {
      lines.push('新请求将被熔断拒绝，直到下月或上调预算。');
    }
  }
  if (ctx.detail) lines.push(ctx.detail);
  lines.push(`时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`);
  lines.push('—— 来自 LLM-Cost-Guard 开源内核');

  const text = lines.join('\n');
  const markdown = `### ${title}\n\n${lines.map((l) => `- ${l}`).join('\n')}`;
  return { title, text, markdown };
}
