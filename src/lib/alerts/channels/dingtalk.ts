import crypto from 'node:crypto';

/**
 * 钉钉自定义机器人 webhook（安全设置选"加签"）。
 *
 * 签名算法（官方文档）：
 *   timestamp = 当前毫秒
 *   sign = urlencode(base64(HMAC-SHA256(key=secret, data=`${timestamp}\n${secret}`)))
 * ★注意与飞书相反：钉钉的 secret 是 HMAC 的 key，"timestamp\nsecret" 是数据。
 */

export function dingtalkSign(timestampMs: number, secret: string): string {
  const stringToSign = `${timestampMs}\n${secret}`;
  const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  return encodeURIComponent(sign);
}

export async function sendDingtalk(
  webhookUrl: string,
  secret: string,
  title: string,
  markdown: string,
): Promise<void> {
  const ts = Date.now();
  const url = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}timestamp=${ts}&sign=${dingtalkSign(ts, secret)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { title, text: markdown } }),
  });
  const body = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
  if (!res.ok || body.errcode !== 0) {
    throw new Error(`钉钉推送失败: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
}
