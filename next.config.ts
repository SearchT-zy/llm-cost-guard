import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker / 自托管部署：输出自包含产物（.next/standalone），配合 docker-entrypoint.sh 使用。
  // 注意：本网关依赖长驻 Node 进程在 SSE 流结束后异步落库，不支持 serverless 平台。
  output: 'standalone',
  // Prisma 原生查询引擎（.node 二进制）不能被 webpack 打包，运行时从 node_modules 解析。
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Prisma Client 自定义输出路径（src/generated/prisma）下的引擎文件需要强制纳入产物追踪，
  // 否则 standalone 产物缺 .node 文件，运行时报 "Query engine library not found"。
  outputFileTracingIncludes: {
    '/api/**': ['./src/generated/prisma/**/*'],
    '/dashboard/**': ['./src/generated/prisma/**/*'],
  },
};

export default nextConfig;
