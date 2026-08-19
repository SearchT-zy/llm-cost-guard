import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alerts/channels';

/**
 * 告警渠道连通性测试（后台设置区按钮）。
 * 用 BURST 类型发送测试消息（突增告警自带每小时冷却，天然防测试刷屏）。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await sendAlert({
    projectId: 'test-project',
    projectName: '渠道连通性测试',
    type: 'BURST',
    detail: '（手动测试消息：收到本条说明渠道配置正确）',
  });
  return NextResponse.json({
    ok: true,
    hint: '结果见告警记录页（SENT / FAILED / SKIPPED_NO_CHANNEL）',
  });
}
