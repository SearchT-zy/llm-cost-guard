import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv 环境变量解析', () => {
  it('空来源时全部取安全默认值', () => {
    const env = loadEnv({});
    expect(env.databaseUrl).toContain('localhost:5432');
    expect(env.usdCnyRate).toBe(7.2);
    expect(env.adminPassword).toBe('');
    expect(env.pricingFallback.enabled).toBe(false);
    expect(env.burst.windowMinutes).toBe(10);
    expect(env.upstreamTimeoutMs).toBe(300_000);
    expect(env.alerts.dingtalk.webhookUrl).toBe('');
  });

  it('覆盖数值 / 布尔多种写法 / 币种', () => {
    const env = loadEnv({
      USD_CNY_RATE: '7.5',
      PRICING_FALLBACK_ENABLED: 'true',
      PRICING_FALLBACK_CURRENCY: 'USD',
      BURST_MIN_CNY: '0.5',
      ALERT_SMTP_PORT: '587',
    });
    expect(env.usdCnyRate).toBe(7.5);
    expect(env.pricingFallback.enabled).toBe(true);
    expect(env.pricingFallback.currency).toBe('USD');
    expect(env.burst.minCny).toBe(0.5);
    expect(env.alerts.smtp.port).toBe(587);

    expect(loadEnv({ PRICING_FALLBACK_ENABLED: '1' }).pricingFallback.enabled).toBe(true);
    expect(loadEnv({ PRICING_FALLBACK_ENABLED: 'no' }).pricingFallback.enabled).toBe(false);
  });

  it('非法数值与零值回退默认（零视为未设置）', () => {
    const env = loadEnv({ USD_CNY_RATE: 'abc', BURST_MULTIPLIER: '0' });
    expect(env.usdCnyRate).toBe(7.2);
    expect(env.burst.multiplier).toBe(10);
  });
});
