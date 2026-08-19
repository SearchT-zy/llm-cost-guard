import crypto from 'node:crypto';

/**
 * 飞书自定义机器人 webhook（安全设置选"签名校验"）。
 *
 * 签名算法（官方文档）：
 *   timestamp = 当前秒（★秒级！钉钉是毫秒，经典踩坑点）
 *   sign = base64(HMAC-SHA256(key=`${timestamp}\n${secret}`, data=''))
 * ★注意与钉钉相反：飞书把 "timestamp\nsecret" 整体作为 HMAC 的 key，空串作为数据。
 */

export function feishuSign(timestampSec: number, secret: string): string {
  const stringToSign = `${timestampSec}\n${secret}`;
  return crypto.createHmac('sha256', stringToSign).update('').digest('base64');
}

export async function sendFeishu(
  webhookUrl: string,
  secret: string,
  title: string,
  text: string,
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp,
      sign: feishuSign(timestamp, secret),
      msg_type: 'text',
      content: { text: `${title}\n${text}` },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
  // 飞书成功返回 {"code":0,...}（部分旧版网关返回 {"StatusCode":0}，code 缺失时按 HTTP 状态判）
  if (!res.ok || (body.code !== undefined && body.code !== 0)) {
    throw new Error(`飞书推送失败: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
}
