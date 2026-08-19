import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '@/lib/env';

/**
 * SMTP 邮件渠道（nodemailer 惰性单例 transporter，复用连接池）。
 * 配置全部来自环境变量（ALERT_SMTP_*）；QQ/163 邮箱 pass 填授权码。
 */

let transporter: Transporter | undefined;

function getTransporter(env = getEnv()): Transporter | null {
  const { smtp } = env.alerts;
  if (!smtp.host || !smtp.to) return null;
  transporter ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465, // 465 = 隐式 TLS；587 走 STARTTLS
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: 10_000,
  });
  return transporter;
}

export async function sendEmail(title: string, text: string): Promise<void> {
  const env = getEnv();
  const tr = getTransporter(env);
  if (!tr) throw new Error('SMTP 未配置（缺 ALERT_SMTP_HOST 或 ALERT_SMTP_TO）');

  // 轻量 HTML 包装（等宽字体对齐金额行）
  const html = `<pre style="font-family:ui-monospace,Consolas,monospace;font-size:14px;line-height:1.6">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</pre>`;

  await tr.sendMail({
    from: env.alerts.smtp.from,
    to: env.alerts.smtp.to,
    subject: title,
    text,
    html,
  });
}
