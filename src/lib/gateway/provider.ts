import type { Provider } from '@/generated/prisma';

/**
 * 上游厂商注册表：默认 baseURL 与流式 usage 注入策略。
 * CUSTOM = 任意 OpenAI 兼容网关（one-api / new-api / vLLM 等），baseUrl 由项目提供。
 */

export interface ProviderConfig {
  label: string;
  baseUrl: string;
  /** 流式请求是否注入 stream_options.include_usage（让上游在末 chunk 返回 usage） */
  injectStreamUsage: boolean;
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  DEEPSEEK: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', injectStreamUsage: true },
  GLM: { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', injectStreamUsage: true },
  QWEN: {
    label: '阿里 Qwen（百炼兼容模式）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    injectStreamUsage: true,
  },
  OPENAI: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', injectStreamUsage: true },
  CUSTOM: { label: '自定义 OpenAI 兼容网关', baseUrl: '', injectStreamUsage: true },
};

/** 解析项目的上游 baseURL：CUSTOM 用项目自带地址，其余用内置地址 */
export function providerBaseUrl(project: {
  provider: Provider;
  baseUrl?: string | null;
}): string {
  if (project.provider === 'CUSTOM') {
    const url = (project.baseUrl ?? '').trim().replace(/\/+$/, '');
    if (!url) throw new Error('CUSTOM 项目未配置 baseUrl，请在后台项目设置中填写');
    return url;
  }
  return PROVIDERS[project.provider].baseUrl;
}
