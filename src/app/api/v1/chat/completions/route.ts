import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { decryptSecret } from '@/lib/crypto/aes-gcm';
import { resolveApiKey } from '@/lib/gateway/auth-key';
import { errors, openaiError } from '@/lib/gateway/errors';
import { PROVIDERS, providerBaseUrl } from '@/lib/gateway/provider';
import { checkBudgetGate } from '@/lib/gateway/budget';
import { normalizeUsage, type UpstreamUsage } from '@/lib/gateway/sse-parser';
import { createParsingStream } from '@/lib/gateway/stream';
import { finalizeRequest, type CharCounts } from '@/lib/gateway/finalize';
import { splitCharKinds } from '@/lib/gateway/estimate';
import { computeCost, type TokenUsage } from '@/lib/pricing/cost';

/**
 * ★★★ 代理网关核心：POST /api/v1/chat/completions（OpenAI 协议兼容）★★★
 *
 * 流程：cgk_ key 鉴权 → 模型白名单 → 预算熔断（转发前）→ 解密上游 key →
 * 转发（流式注入 stream_options.include_usage）→ 流式边转发边解析 /
 * 非流式直接读 usage → 流结束后异步计费落库 + 阈值/突增告警。
 *
 * ★技术限制：预算熔断只拦截"新请求"；正在流式输出中的请求无法强行终止
 * （生成方在上游，断流只会让客户端收到截断且上游照常计费）—— 详见
 * src/lib/gateway/budget.ts 头注释。
 *
 * runtime 必须是 nodejs：Prisma / node:crypto / 长流式转发都依赖 Node。
 * 本网关要求长驻 Node 进程（流结束后异步落库），不支持 serverless。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BODY_LIMIT_BYTES = 10 * 1024 * 1024;

const ZERO_USAGE: TokenUsage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 };
const ZERO_CHARS: CharCounts = { ascii: 0, cjk: 0 };

function fmtMoney(v: number, currency: 'CNY' | 'USD'): string {
  return currency === 'USD' ? `$${v.toFixed(2)}` : `¥${v.toFixed(2)}`;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const env = getEnv();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

  // ① 鉴权：cgk_ 虚拟 key（sha256 反查项目）
  const auth = await resolveApiKey(req.headers.get('authorization'));
  if (auth.kind === 'invalid') return errors.invalidApiKey();
  if (auth.kind === 'revoked') return errors.keyRevoked();
  const { project, keyId } = auth;

  // ② 解析并校验请求体
  const raw = await req.text();
  if (raw.length > BODY_LIMIT_BYTES) return errors.invalidBody('请求体超过 10MB 限制');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return errors.invalidBody('JSON 解析失败');
  }
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  const stream = body.stream === true;
  if (!model) return errors.invalidBody('缺少 model 字段');
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return errors.invalidBody('缺少 messages 字段');
  }

  if (!project.allowedModels.includes(model)) {
    await finalizeRequest({
      project,
      keyId,
      model: model || '(empty)',
      streaming: stream,
      status: 'BLOCKED',
      httpStatus: 403,
      errorDetail: 'model_not_allowed',
      usage: ZERO_USAGE,
      promptChars: ZERO_CHARS,
      completionChars: ZERO_CHARS,
      latencyMs: Date.now() - t0,
      ttfbMs: null,
      clientIp,
    });
    return errors.modelNotAllowed(model);
  }

  // ③ 预算熔断（转发前的新请求闸门；进行中的流式请求无法终止 —— 见文件头）
  const gate = await checkBudgetGate(project);
  if (gate.blocked && gate.budget != null) {
    await finalizeRequest({
      project,
      keyId,
      model,
      streaming: stream,
      status: 'BLOCKED',
      httpStatus: 429,
      errorDetail: 'monthly_budget_exceeded',
      usage: ZERO_USAGE,
      promptChars: ZERO_CHARS,
      completionChars: ZERO_CHARS,
      latencyMs: Date.now() - t0,
      ttfbMs: null,
      clientIp,
    });
    return errors.budgetExceeded(
      fmtMoney(gate.budget, project.budgetCurrency),
      fmtMoney(gate.spent, project.budgetCurrency),
    );
  }

  // ④ 解密上游 key + 解析上游地址（只在内存中瞬间使用，绝不外传/回显）
  let upstreamKey: string;
  try {
    upstreamKey = decryptSecret(project.upstreamKeyEncrypted, env.encryptionKey);
  } catch (err) {
    return openaiError(
      500,
      `上游密钥解密失败：${(err as Error).message}。请检查 ENCRYPTION_KEY 是否与保存密钥时一致。`,
      'api_error',
      'decrypt_failed',
    );
  }
  let baseUrl: string;
  try {
    baseUrl = providerBaseUrl(project);
  } catch {
    return openaiError(500, '项目未配置上游地址（CUSTOM 项目需要 baseUrl）', 'api_error', 'missing_base_url');
  }

  // ⑤ 构造上游请求体：流式时注入 stream_options.include_usage，让末 chunk 带 usage
  const upstreamBody: Record<string, unknown> = { ...body };
  if (stream && PROVIDERS[project.provider].injectStreamUsage) {
    upstreamBody.stream_options = {
      ...(typeof body.stream_options === 'object' && body.stream_options !== null
        ? (body.stream_options as Record<string, unknown>)
        : {}),
      include_usage: true,
    };
  }

  // 输入侧字符统计（估算兜底与审计用；只统计长度，不落库内容）
  const promptChars = splitCharKinds(JSON.stringify(body.messages));

  // ⑥ 转发
  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstreamKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(env.upstreamTimeoutMs),
    });
  } catch (err) {
    const name = (err as Error)?.name ?? '';
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    await finalizeRequest({
      project, keyId, model, streaming: stream,
      status: 'UPSTREAM_ERROR',
      httpStatus: timedOut ? 504 : 502,
      errorDetail: `${name}: ${(err as Error)?.message ?? String(err)}`.slice(0, 200),
      usage: ZERO_USAGE,
      promptChars: ZERO_CHARS,
      completionChars: ZERO_CHARS,
      latencyMs: Date.now() - t0,
      ttfbMs: null,
      clientIp,
    });
    return timedOut
      ? errors.upstreamTimeout()
      : errors.upstreamUnreachable((err as Error).message.slice(0, 120));
  }

  const ttfbMs = Date.now() - t0;

  // ⑦ 上游非 2xx：状态与响应体透传（客户端能看到真实上游错误），并落 UPSTREAM_ERROR
  if (!upstream.ok || !upstream.body) {
    const errText = (await upstream.text()).slice(0, 64 * 1024);
    await finalizeRequest({
      project, keyId, model, streaming: stream,
      status: 'UPSTREAM_ERROR',
      httpStatus: upstream.status,
      errorDetail: `上游 ${upstream.status}: ${errText.slice(0, 160)}`,
      usage: ZERO_USAGE,
      promptChars: ZERO_CHARS,
      completionChars: ZERO_CHARS,
      latencyMs: Date.now() - t0,
      ttfbMs: null,
      clientIp,
    });
    return new NextResponse(errText, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  // ⑧ 流式：TransformStream 边转发边解析；[DONE] 送完客户端后才异步落库（硬约束）
  if (stream) {
    let lastUsage: UpstreamUsage | null = null;
    let completionChars: CharCounts = { ascii: 0, cjk: 0 };

    const parsing = createParsingStream({
      onUsage: (u) => {
        lastUsage = u;
      },
      onDelta: (text) => {
        const k = splitCharKinds(text);
        completionChars = {
          ascii: completionChars.ascii + k.ascii,
          cjk: completionChars.cjk + k.cjk,
        };
      },
      onFinalize: (reason) => {
        // fire-and-forget：绝不阻塞/弄挂已完成的响应
        void finalizeRequest({
          project, keyId, model, streaming: true,
          status: reason === 'complete' ? 'SUCCESS' : 'CLIENT_ABORTED',
          httpStatus: 200,
          usage: lastUsage,
          promptChars,
          completionChars,
          latencyMs: Date.now() - t0,
          ttfbMs,
          clientIp,
        }).catch((e) => console.error('[gateway] finalize 失败：', e));
      },
    });

    return new NextResponse(upstream.body.pipeThrough(parsing), {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no', // 前置 nginx 反代时禁用缓冲，SSE 必须
      },
    });
  }

  // ⑨ 非流式：读完整 JSON，直接取 usage 计费
  const jsonText = await upstream.text();
  let json: {
    usage?: unknown;
    choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
  };
  try {
    json = JSON.parse(jsonText);
  } catch {
    await finalizeRequest({
      project, keyId, model, streaming: false,
      status: 'UPSTREAM_ERROR',
      httpStatus: 502,
      errorDetail: '上游 200 但响应体不是合法 JSON',
      usage: ZERO_USAGE,
      promptChars: ZERO_CHARS,
      completionChars: ZERO_CHARS,
      latencyMs: Date.now() - t0,
      ttfbMs,
      clientIp,
    });
    return errors.badGateway('上游返回了无法解析的响应体');
  }

  const usage = json.usage ? normalizeUsage(json.usage) : null;
  const msg = json.choices?.[0]?.message;
  const outText =
    (typeof msg?.content === 'string' ? msg.content : '') +
    (typeof msg?.reasoning_content === 'string' ? msg.reasoning_content : '');

  await finalizeRequest({
    project, keyId, model, streaming: false,
    status: 'SUCCESS',
    httpStatus: 200,
    usage,
    promptChars,
    completionChars: splitCharKinds(outText),
    latencyMs: Date.now() - t0,
    ttfbMs,
    clientIp,
  });

  return new NextResponse(jsonText, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
