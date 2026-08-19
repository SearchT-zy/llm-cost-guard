/**
 * SSE 流增量解析（纯函数状态机，零依赖）。
 *
 * 关键正确性点：
 * - 跨 chunk 断行安全：网络 chunk 可能在任意字节处切断（行中间 / JSON 中间），
 *   用行缓冲保存最后一段不完整行，等下一个 chunk 拼齐 —— 这是手写 SSE 解析
 *   最常见的 bug 来源。
 * - usage 固定出现在最后一个 chunk（因为请求注入了 stream_options.include_usage），
 *   保存"最后一次"收到的 usage，防御个别实现分多段返回。
 * - delta.content / delta.reasoning_content（GLM / DeepSeek 思考链）只累计字符数，
 *   不保存内容本身 —— 隐私边界：网关不落库任何 prompt / completion 文本。
 * - 单行 JSON.parse 失败静默跳过（防御上游非标准输出）。
 */

export interface UpstreamUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number; // DeepSeek prompt_cache_hit_tokens / OpenAI prompt_tokens_details.cached_tokens
}

export interface SseCallbacks {
  onUsage: (usage: UpstreamUsage) => void;
  /** 每个 delta 文本片段（不存储内容，只用于字符统计） */
  onDelta: (text: string) => void;
  onDone: () => void;
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** 归一化各厂商 usage 字段（非流式 JSON 响应同样复用） */
export function normalizeUsage(raw: unknown): UpstreamUsage {
  const u = (raw ?? {}) as Record<string, unknown>;
  const promptTokens = toInt(u.prompt_tokens);
  const completionTokens = toInt(u.completion_tokens);
  const cached = toInt(
    (u as Record<string, any>).prompt_cache_hit_tokens ??
      (u as Record<string, any>).prompt_tokens_details?.cached_tokens ??
      0,
  );
  return {
    promptTokens,
    completionTokens,
    totalTokens: toInt(u.total_tokens) || promptTokens + completionTokens,
    cachedTokens: Math.min(cached, promptTokens),
  };
}

function handleLine(line: string, cb: SseCallbacks): void {
  if (!line.startsWith('data:')) return; // 忽略 event:/id:/注释行/空行
  const payload = line.slice(5).trim();
  if (payload === '[DONE]') {
    cb.onDone();
    return;
  }
  try {
    const j = JSON.parse(payload) as {
      usage?: unknown;
      choices?: Array<{ delta?: { content?: unknown; reasoning_content?: unknown } }>;
    };
    if (j.usage && typeof j.usage === 'object') cb.onUsage(normalizeUsage(j.usage));
    const delta = j.choices?.[0]?.delta;
    const text =
      typeof delta?.content === 'string'
        ? delta.content
        : typeof delta?.reasoning_content === 'string'
          ? delta.reasoning_content
          : '';
    if (text) cb.onDelta(text);
  } catch {
    // 坏行静默跳过
  }
}

export function createSseParser(cb: SseCallbacks) {
  const decoder = new TextDecoder();
  let buffer = '';

  return {
    push(chunk: Uint8Array): void {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // 最后一段可能不完整，留待下个 chunk
      for (const line of lines) handleLine(line.trim(), cb);
    },

    /** 流结束：冲洗行缓冲里最后一段（无换行结尾的 data: 行） */
    flush(): void {
      const rest = buffer.trim();
      buffer = '';
      if (rest) handleLine(rest, cb);
    },
  };
}
