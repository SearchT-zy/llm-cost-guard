import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LLM-Cost-Guard 控制台',
    template: '%s · LLM-Cost-Guard',
  },
  description: '轻量化 LLM API 账单审计网关：用量统计 / 成本审计 / 预算熔断 / 告警推送',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
