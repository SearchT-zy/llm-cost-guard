-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('DEEPSEEK', 'GLM', 'QWEN', 'OPENAI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('TEST', 'PROD');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CNY', 'USD');

-- CreateEnum
CREATE TYPE "BudgetCurrency" AS ENUM ('CNY', 'USD');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('SUCCESS', 'UPSTREAM_ERROR', 'CLIENT_ABORTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('BUDGET_80', 'BUDGET_100', 'BURST');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED_NO_CHANNEL');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'TEST',
    "provider" "Provider" NOT NULL,
    "baseUrl" TEXT,
    "upstreamKeyEncrypted" TEXT NOT NULL,
    "upstreamKeyMask" TEXT NOT NULL,
    "allowedModels" TEXT[],
    "monthlyBudget" DECIMAL(14,2),
    "budgetCurrency" "BudgetCurrency" NOT NULL DEFAULT 'CNY',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectKey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "keyHash" TEXT NOT NULL,
    "keyMask" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyId" TEXT,
    "provider" "Provider" NOT NULL,
    "model" TEXT NOT NULL,
    "streaming" BOOLEAN NOT NULL,
    "status" "UsageStatus" NOT NULL,
    "httpStatus" INTEGER,
    "errorDetail" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "tokensEstimated" BOOLEAN NOT NULL DEFAULT false,
    "promptChars" INTEGER,
    "completionChars" INTEGER,
    "currency" "Currency" NOT NULL,
    "inputPricePerM" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "cachedInputPricePerM" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "outputPricePerM" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "costCny" DECIMAL(16,8) NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(16,8) NOT NULL DEFAULT 0,
    "rateUsdCny" DECIMAL(10,4) NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "ttfbMs" INTEGER,
    "clientIp" TEXT,
    "day" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "AlertType" NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_isEnabled_idx" ON "Project"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectKey_keyHash_key" ON "ProjectKey"("keyHash");

-- CreateIndex
CREATE INDEX "ProjectKey_projectId_idx" ON "ProjectKey"("projectId");

-- CreateIndex
CREATE INDEX "UsageLog_projectId_createdAt_idx" ON "UsageLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_month_projectId_idx" ON "UsageLog"("month", "projectId");

-- CreateIndex
CREATE INDEX "UsageLog_day_idx" ON "UsageLog"("day");

-- CreateIndex
CREATE INDEX "UsageLog_model_idx" ON "UsageLog"("model");

-- CreateIndex
CREATE UNIQUE INDEX "AlertEvent_dedupKey_key" ON "AlertEvent"("dedupKey");

-- CreateIndex
CREATE INDEX "AlertEvent_projectId_createdAt_idx" ON "AlertEvent"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectKey" ADD CONSTRAINT "ProjectKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "ProjectKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

