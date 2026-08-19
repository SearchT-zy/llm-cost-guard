# syntax=docker/dockerfile:1
# ── 阶段 1：依赖 ──────────────────────────────────────────────
# --ignore-scripts：跳过 postinstall(prisma generate)，此时还没有 schema
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── 阶段 2：构建 ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
# 先生成 Prisma Client（TS 编译依赖 src/generated/prisma 类型）
RUN npx prisma generate
COPY . .
RUN npm run build

# ── 阶段 3：运行 ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# openssl：Prisma 查询引擎链接系统 libssl；ca-certificates：HTTPS 上游必需
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# migrate deploy 需要 schema + 迁移 + Prisma CLI（standalone 产物不含 devDependencies）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
