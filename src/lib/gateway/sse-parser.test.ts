import { describe, expect, it } from 'vitest';
import {
  createSseParser,
  normalizeUsage,
  type SseCallbacks,
  type UpstreamUsage,
} from './sse-parser';

function collector() {
  const state: { usages: UpstreamUsage[]; chars: number; done: number } = {
    usages: [],
    chars: 0,
    done: 0,
  };
  const cb: SseCallbacks = {
    onUsage: (u) => state.usages.push(u),
    onDelta: (t) => (state.chars += t.length),
    onDone: () => state.done++,
  };
  return { state, cb };
}

const CHUNKS_OK = [
  'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
  'data: {"choices":[{"delta":{"reasoning_content":"思考中"}}]}\n',
  'data: {"choices":[{"delta":{"content":"，世界"}}]}\n\n',
  'data: {"usage":{"prompt_tokens":100,"completion_tokens":20,"total_tokens":120}}\n\n',
  'data: [DONE]\n\n',
];

describe('SSE 解析器', () => {
  it('正常流：累计 delta 字符、末 chunk usage、[DONE]', () => {
    const { state, cb } = collector();
    const parser = createSseParser(cb);
    for (const c of CHUNKS_OK) parser.push(new TextEncoder().encode(c));
    parser.flush();
    expect(state.chars).toBe(2 + 3 + 3); // 你好 + 思考中 + ，世界
    expect(state.usages.at(-1)).toEqual({
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      cachedTokens: 0,
    });
    expect(state.done).toBe(1);
  });

  it('★chunk 在行中间 / JSON 中间 / UTF-8 字符中间切断仍正确解析', () => {
    const { state, cb } = collector();
    const parser = createSseParser(cb);
    const whole = CHUNKS_OK.join('');
    const bytes = new TextEncoder().encode(whole);
    for (let i = 0; i < bytes.length; i += 7) {
      parser.push(bytes.slice(i, i + 7));
    }
    parser.flush();
    expect(state.chars).toBe(8);
    expect(state.usages.at(-1)?.promptTokens).toBe(100);
    expect(state.done).toBe(1);
  });

  it('多段 usage 逐段上报，消费方保留最后一次（防御性）', () => {
    const { state, cb } = collector();
    const parser = createSseParser(cb);
    parser.push(
      new TextEncoder().encode(
        'data: {"usage":{"prompt_tokens":1,"completion_tokens":1}}\n\n',
      ),
    );
    parser.push(
      new TextEncoder().encode(
        'data: {"usage":{"prompt_tokens":50,"completion_tokens":5,"total_tokens":55}}\n\n',
      ),
    );
    expect(state.usages).toHaveLength(2);
    expect(state.usages.at(-1)?.promptTokens).toBe(50);
  });

  it('坏行 / 非 data 行 / 注释行静默跳过', () => {
    const { state, cb } = collector();
    const parser = createSseParser(cb);
    parser.push(new TextEncoder().encode(': keepalive\n\n'));
    parser.push(new TextEncoder().encode('event: message\n'));
    parser.push(new TextEncoder().encode('data: {broken json\n\n'));
    parser.push(
      new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'),
    );
    expect(state.chars).toBe(2);
    expect(state.usages).toHaveLength(0);
  });

  it('flush 处理无换行结尾的最后一段', () => {
    const { state, cb } = collector();
    const parser = createSseParser(cb);
    parser.push(
      new TextEncoder().encode(
        'data: {"usage":{"prompt_tokens":9,"completion_tokens":9,"total_tokens":18}}',
      ),
    );
    parser.flush();
    expect(state.usages.at(-1)?.promptTokens).toBe(9);
  });
});

describe('normalizeUsage 各厂商字段', () => {
  it('DeepSeek：prompt_cache_hit_tokens', () => {
    const u = normalizeUsage({
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
      prompt_cache_hit_tokens: 400,
      prompt_cache_miss_tokens: 600,
    });
    expect(u.cachedTokens).toBe(400);
  });

  it('OpenAI：prompt_tokens_details.cached_tokens', () => {
    const u = normalizeUsage({
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
      prompt_tokens_details: { cached_tokens: 300 },
    });
    expect(u.cachedTokens).toBe(300);
  });

  it('脏数据：cached > prompt 收敛；缺 total 兜底求和', () => {
    const u = normalizeUsage({
      prompt_tokens: 100,
      completion_tokens: 50,
      prompt_cache_hit_tokens: 999,
    });
    expect(u.cachedTokens).toBe(100);
    expect(u.totalTokens).toBe(150);
  });

  it('空对象 / null 安全', () => {
    expect(normalizeUsage(null)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0,
    });
  });
});
