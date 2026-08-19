import { NextResponse } from 'next/server';

/**
 * OpenAI 风格错误响应构造器。
 * 兼容 OpenAI SDK 的错误解析（error.message / error.type / error.code），
 * 让接入方无需改造错误处理逻辑。
 */

export function openaiError(
  status: number,
  message: string,
  type: string,
  code?: string,
): NextResponse {
  return NextResponse.json(
    { error: { message, type, ...(code ? { code } : {}) } },
    { status },
  );
}

export const errors = {
  invalidApiKey: () =>
    openaiError(
      401,
      '无效的 API Key。本网关使用项目虚拟 key（cgk_ 前缀），请在后台「项目与密钥」页创建。',
      'invalid_request_error',
      'invalid_api_key',
    ),

  keyRevoked: () =>
    openaiError(401, '该 API Key 已被吊销，或所属项目已停用。', 'invalid_request_error', 'key_revoked'),

  modelNotAllowed: (model: string) =>
    openaiError(
      403,
      `模型 "${model}" 不在本项目的 allowedModels 白名单中，请在后台项目设置里添加。`,
      'invalid_request_error',
      'model_not_allowed',
    ),

  /** ★预算熔断：只拦新请求，进行中的流式请求无法终止（详见 budget.ts 头注释） */
  budgetExceeded: (budget: string, spent: string) =>
    openaiError(
      429,
      `项目当月预算已耗尽（预算 ${budget}，已消耗 ${spent}），新请求被拒绝。` +
        '注意：预算熔断只能拦截新请求，已在执行中的流式请求无法强行终止。',
      'insufficient_quota',
      'monthly_budget_exceeded',
    ),

  invalidBody: (detail: string) =>
    openaiError(400, `请求体无效：${detail}`, 'invalid_request_error', 'invalid_body'),

  upstreamTimeout: () =>
    openaiError(504, '上游模型响应超时（UPSTREAM_TIMEOUT_MS）。', 'api_error', 'upstream_timeout'),

  upstreamUnreachable: (detail: string) =>
    openaiError(502, `无法连接上游模型服务：${detail}`, 'api_error', 'upstream_unreachable'),

  badGateway: (detail: string) =>
    openaiError(502, `上游返回异常响应：${detail}`, 'api_error', 'bad_gateway'),
};
