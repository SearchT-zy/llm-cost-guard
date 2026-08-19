/**
 * 环境变量集中解析（手写，不引 zod —— 刻意保持最小依赖）。
 *
 * 约定：
 * - 业务代码不直接读 process.env，统一从这里拿已归一化的值；
 * - loadEnv(source) 是纯函数，便于单测注入；
 * - getEnv() 进程内缓存，运行时使用。
 */

export type CurrencyCode = 'CNY' | 'USD';

export interface AppEnv {
  databaseUrl: string;
  /** base64 编码的 32 字节 AES 密钥；长度校验在 crypto/aes-gcm.ts 使用时执行 */
  encryptionKey: string;
  /** 空 = 未启用密码登录，后台仅允许本机访问（见 middleware.ts） */
  adminPassword: string;
  usdCnyRate: number;
  pricingFallback: {
    enabled: boolean;
    input: number;
    output: number;
    currency: CurrencyCode;
  };
  upstreamTimeoutMs: number;
  sessionTtlHours: number;
  estimate: { asciiPerToken: number; cjkPerToken: number };
  burst: {
    windowMinutes: number;
    budgetRatio: number;
    multiplier: number;
    minCny: number;
  };
  alerts: {
    dingtalk: { webhookUrl: string; secret: string };
    feishu: { webhookUrl: string; secret: string };
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
      to: string;
    };
  };
}

type Source = Record<string, string | undefined>;

function str(src: Source, name: string, fallback = ''): string {
  const v = src[name];
  return v === undefined || v === '' ? fallback : v;
}

function num(src: Source, name: string, fallback: number): number {
  const v = Number(src[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function bool(src: Source, name: string, fallback: boolean): boolean {
  const v = src[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function currency(src: Source, name: string, fallback: CurrencyCode): CurrencyCode {
  return src[name] === 'USD' ? 'USD' : fallback;
}

export function loadEnv(src: Source = process.env): AppEnv {
  return {
    databaseUrl: str(src, 'DATABASE_URL', 'postgresql://llmcg:change-me@localhost:5432/llmcg'),
    encryptionKey: str(src, 'ENCRYPTION_KEY'),
    adminPassword: str(src, 'ADMIN_PASSWORD'),
    usdCnyRate: num(src, 'USD_CNY_RATE', 7.2),
    pricingFallback: {
      enabled: bool(src, 'PRICING_FALLBACK_ENABLED', false),
      input: num(src, 'PRICING_FALLBACK_INPUT', 1),
      output: num(src, 'PRICING_FALLBACK_OUTPUT', 2),
      currency: currency(src, 'PRICING_FALLBACK_CURRENCY', 'CNY'),
    },
    upstreamTimeoutMs: num(src, 'UPSTREAM_TIMEOUT_MS', 300_000),
    sessionTtlHours: num(src, 'SESSION_TTL_HOURS', 12),
    estimate: {
      asciiPerToken: num(src, 'ESTIMATE_ASCII_PER_TOKEN', 4),
      cjkPerToken: num(src, 'ESTIMATE_CJK_PER_TOKEN', 1),
    },
    burst: {
      windowMinutes: num(src, 'BURST_WINDOW_MINUTES', 10),
      budgetRatio: num(src, 'BURST_BUDGET_RATIO', 0.2),
      multiplier: num(src, 'BURST_MULTIPLIER', 10),
      minCny: num(src, 'BURST_MIN_CNY', 1),
    },
    alerts: {
      dingtalk: {
        webhookUrl: str(src, 'ALERT_DINGTALK_WEBHOOK_URL'),
        secret: str(src, 'ALERT_DINGTALK_SECRET'),
      },
      feishu: {
        webhookUrl: str(src, 'ALERT_FEISHU_WEBHOOK_URL'),
        secret: str(src, 'ALERT_FEISHU_SECRET'),
      },
      smtp: {
        host: str(src, 'ALERT_SMTP_HOST'),
        port: num(src, 'ALERT_SMTP_PORT', 465),
        user: str(src, 'ALERT_SMTP_USER'),
        pass: str(src, 'ALERT_SMTP_PASS'),
        from: str(src, 'ALERT_SMTP_FROM', 'llm-cost-guard@example.com'),
        to: str(src, 'ALERT_SMTP_TO'),
      },
    },
  };
}

let cached: AppEnv | undefined;

/** 进程内缓存的环境（Next dev 热重载下也保持单份） */
export function getEnv(): AppEnv {
  cached ??= loadEnv();
  return cached;
}

/** 仅供测试重置缓存 */
export function resetEnvCache(): void {
  cached = undefined;
}
