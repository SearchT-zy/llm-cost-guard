/**
 * server → client 的唯一跨界类型。
 *
 * ★硬性规则：Prisma Decimal / Date 不允许直接传给 client component
 * （React Server Components 只接受可序列化的 plain object）。
 * Decimal → Number（展示精度足够）、Date → ISO 字符串，一律在 lib/query/* 内完成。
 */

export interface ProjectKeyDto {
  id: string;
  name: string;
  keyMask: string; // ★掩码，明文永不回传
  lastUsedAt: string | null;
  isEnabled: boolean;
  createdAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  environment: 'TEST' | 'PROD';
  provider: 'DEEPSEEK' | 'GLM' | 'QWEN' | 'OPENAI' | 'CUSTOM';
  baseUrl: string | null;
  upstreamKeyMask: string; // ★掩码，密文永不回传
  allowedModels: string[];
  monthlyBudget: number | null;
  budgetCurrency: 'CNY' | 'USD';
  isEnabled: boolean;
  createdAt: string;
  keys: ProjectKeyDto[];
}

export interface UsageLogDto {
  id: string;
  projectId: string;
  projectName: string;
  environment: 'TEST' | 'PROD';
  model: string;
  provider: string;
  streaming: boolean;
  status: string;
  httpStatus: number | null;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensEstimated: boolean;
  costCny: number;
  costUsd: number;
  currency: 'CNY' | 'USD';
  inputPricePerM: number;
  outputPricePerM: number;
  latencyMs: number;
  ttfbMs: number | null;
  errorDetail: string | null;
  createdAt: string;
}

export interface AlertEventDto {
  id: string;
  projectId: string | null;
  projectName: string | null;
  type: string;
  status: string;
  detail: string | null;
  createdAt: string;
}

/** 折线图数据点（label 已按 天/周/月 折叠） */
export interface TrendPointDto {
  label: string;
  costCny: number;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  calls: number;
}

/** 分组汇总条目（项目 / 模型 / 环境） */
export interface BreakdownItemDto {
  label: string;
  costCny: number;
  costUsd: number;
  calls: number;
}

/** Prisma Project 记录 → DTO（掩码回显、Decimal→number、Date→ISO；admin API 与页面共用） */
export function toProjectDto(p: {
  id: string;
  name: string;
  description: string | null;
  environment: 'TEST' | 'PROD';
  provider: ProjectDto['provider'];
  baseUrl: string | null;
  upstreamKeyMask: string;
  allowedModels: string[];
  monthlyBudget: unknown;
  budgetCurrency: 'CNY' | 'USD';
  isEnabled: boolean;
  createdAt: Date;
  keys: Array<{
    id: string;
    name: string;
    keyMask: string;
    lastUsedAt: Date | null;
    isEnabled: boolean;
    createdAt: Date;
  }>;
}): ProjectDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    environment: p.environment,
    provider: p.provider,
    baseUrl: p.baseUrl,
    upstreamKeyMask: p.upstreamKeyMask,
    allowedModels: p.allowedModels,
    monthlyBudget: p.monthlyBudget == null ? null : Number(p.monthlyBudget),
    budgetCurrency: p.budgetCurrency,
    isEnabled: p.isEnabled,
    createdAt: p.createdAt.toISOString(),
    keys: p.keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyMask: k.keyMask,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      isEnabled: k.isEnabled,
      createdAt: k.createdAt.toISOString(),
    })),
  };
}
