import { createSseParser, type UpstreamUsage } from './sse-parser';

/**
 * 流式转发管道：TransformStream 单管道方案（边转发边解析）。
 *
 * - transform：把原始字节喂给解析器后原样 enqueue —— 不缓冲、不等待解析，
 *   保住首 token 延迟（TTFB）。
 * - flush：上游流正常读尽（[DONE] 已送达客户端）后触发。★硬约束落点：
 *   完整的 token 统计与成本落库只发生在 onFinalize（内部 fire-and-forget），
 *   绝不在这里 await —— 流式响应必须先完整交给客户端，之后才统计入账。
 * - cancel：客户端中途断连时被调用；取消会沿 pipe 链传播回 upstream.body，
 *   尽量让上游停止生成（止损），已生成的部分按估算落账为 CLIENT_ABORTED。
 *
 * 备选方案（不采用，仅记录）：upstream.body.tee() 双分支 —— 一支返回客户端、
 * 一支异步解析。缺点：客户端断连只取消客户端分支，解析分支要手动接管取消；
 * 两分支背压独立，慢消费分支会内存堆积。
 */

export interface StreamHooks {
  onUsage: (usage: UpstreamUsage) => void;
  onDelta: (text: string) => void;
  /** 'complete' = 流完整结束；'client_abort' = 客户端中途断连 */
  onFinalize: (reason: 'complete' | 'client_abort') => void;
}

export function createParsingStream(hooks: StreamHooks): TransformStream<Uint8Array, Uint8Array> {
  const parser = createSseParser({
    onUsage: hooks.onUsage,
    onDelta: hooks.onDelta,
    onDone: () => {}, // [DONE] 不单独处理，统一由 flush/cancel 收口
  });

  // 说明：Transformer.cancel 是 WHATWG Streams 规范的一部分（readable 被取消时调用），
  // Node 22 运行时完整支持；TS 的 lib.dom 类型尚未收录，故整体断言。
  const transformer = {
    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
      parser.push(chunk);
      controller.enqueue(chunk);
    },
    flush() {
      parser.flush();
      hooks.onFinalize('complete');
    },
    cancel() {
      hooks.onFinalize('client_abort');
    },
  } as unknown as Transformer<Uint8Array, Uint8Array>;

  return new TransformStream<Uint8Array, Uint8Array>(transformer);
}
