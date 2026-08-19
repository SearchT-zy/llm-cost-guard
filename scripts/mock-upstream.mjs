#!/usr/bin/env node
/**
 * 本地 mock 上游（OpenAI 兼容协议）—— 不用真实厂商 key 就能端到端联调本网关：
 *
 *   node scripts/mock-upstream.mjs [--port 9099] [--no-usage] [--delay-ms 30]
 *
 * - 接受 /v1/chat/completions（Bearer sk-mock）与 /v1/models
 * - 流式返回中文分片 SSE + 末 chunk usage（含 prompt_cache_hit_tokens，模拟 DeepSeek）
 * - --no-usage：末 chunk 不带 usage —— 用于验证网关的字符估算兜底（tokensEstimated）
 */
import http from 'node:http';

const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 9099;
const noUsage = args.includes('--no-usage');
const delayMs = Number(args[args.indexOf('--delay-ms') + 1]) || 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body = {};
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    /* GET / 空 body */
  }

  if (req.method === 'GET' && req.url?.includes('/models')) {
    return json(res, 200, {
      object: 'list',
      data: [{ id: 'mock-chat', object: 'model', owned_by: 'mock' }],
    });
  }

  if (!req.url?.includes('/chat/completions')) {
    return json(res, 404, {
      error: { message: `mock: 未实现 ${req.url}`, type: 'invalid_request_error' },
    });
  }

  const auth = req.headers.authorization ?? '';
  if (auth !== 'Bearer sk-mock') {
    return json(res, 401, {
      error: {
        message: 'mock 上游只接受 Bearer sk-mock',
        type: 'invalid_request_error',
        code: 'invalid_api_key',
      },
    });
  }

  const model = typeof body.model === 'string' ? body.model : 'mock-chat';
  const firstUser = (Array.isArray(body.messages) ? body.messages : []).find(
    (m) => m?.role === 'user',
  );
  const userText =
    typeof firstUser?.content === 'string'
      ? firstUser.content
      : JSON.stringify(firstUser?.content ?? '');
  const replyText = `你好，这是 mock 上游的回复（模型 ${model}）。你说的是：${userText.slice(0, 50)}`;

  if (body.stream === true) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    const pieces = replyText.match(/[\s\S]{1,6}/g) ?? [];
    for (const p of pieces) {
      res.write(
        `data: ${JSON.stringify({
          id: 'mock-stream-1',
          object: 'chat.completion.chunk',
          model,
          choices: [{ index: 0, delta: { content: p } }],
        })}\n\n`,
      );
      await sleep(delayMs);
    }
    if (!noUsage) {
      res.write(
        `data: ${JSON.stringify({
          id: 'mock-stream-1',
          object: 'chat.completion.chunk',
          model,
          choices: [],
          usage: {
            prompt_tokens: 42,
            completion_tokens: 66,
            total_tokens: 108,
            prompt_cache_hit_tokens: 10, // 模拟 DeepSeek 缓存命中
          },
        })}\n\n`,
      );
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  return json(res, 200, {
    id: 'mock-completion-1',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      { index: 0, message: { role: 'assistant', content: replyText }, finish_reason: 'stop' },
    ],
    usage: noUsage
      ? undefined
      : { prompt_tokens: 42, completion_tokens: 66, total_tokens: 108, prompt_cache_hit_tokens: 10 },
  });
});

server.listen(port, () => {
  console.log(
    `[mock-upstream] http://localhost:${port}/v1  （Bearer sk-mock${noUsage ? '，--no-usage 估算兜底模式' : ''}）`,
  );
});
