# LLM-Cost-Guard

轻量化 **LLM API 账单审计网关**：把 DeepSeek / GLM / Qwen / GPT 等多家模型的调用统一收口到一个兼容 OpenAI 协议的代理网关，实时统计 token 与成本、按项目归因、预算熔断、异常告警、财务报表导出。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## 1. 项目简介

国内开发者常见痛点：多家模型 API 混用、每家一个控制台、账单碎片化；某个项目跑飞了没人知道；想设预算上限没有熔断；告警想发钉钉/飞书但市面工具不支持。

LLM-Cost-Guard 只做一件事并做好：**站在你的应用和模型 API 之间记账与看门**。

- 应用侧只需把 OpenAI SDK 的 `baseURL` 换成本网关、API Key 换成项目虚拟 key（`cgk_` 前缀），**零代码改造**
- 每次调用实时解析 token（含流式 SSE），按内置价格表计算成本，双币种（CNY/USD）快照入账
- 到预算阈值（80%/100%）自动告警，100% 后拒绝新请求（熔断）
- 支持钉钉 webhook（加签）、飞书 webhook（签名）、邮件告警——国内本土化渠道优先

**明确不做**（保持轻量，不是 Langfuse 的替代品）：全链路 Trace、Prompt 内容存储与评测、会话回放。网关不落库任何 prompt/completion 文本，只记长度。

开源协议：[MIT](./LICENSE)。

## 2. 功能列表

### 【开源内核能力】（本仓库，MIT）

| 模块 | 说明 |
|---|---|
| **API 代理网关** | OpenAI 协议兼容（`/api/v1/chat/completions`、`/api/v1/models`），流式 SSE / 非流式；转发 DeepSeek / GLM / Qwen / OpenAI 及任意自建兼容网关（CUSTOM） |
| **Token 解析与计费** | 流式在 `[DONE]` 后统计完整输出 token；DeepSeek 缓存命中/未命中双输入价；上游不返回 usage 时按字符估算兜底（标记 ±50% 误差） |
| **双币种记账** | 每条调用按模型原生货币计价 + 汇率快照换算 CNY/USD；单价与汇率随行落库，改价格表不改历史账 |
| **项目 & 密钥管理** | 多项目、环境标签（测试/生产）归因、模型白名单、独立月度预算、多把可吊销的虚拟 key |
| **密钥安全** | 上游厂商 key AES-256-GCM 加密存储、界面只回掩码；虚拟 key 只存 sha256 哈希、明文仅创建时展示一次 |
| **预算熔断** | 当月消耗达预算后拒绝新请求（429 `monthly_budget_exceeded`） |
| **静态阈值告警** | 80% / 100% 阈值告警，每阈值每月去重 |
| **突增异常检测** | 朴素滑动窗口启发式（预算占比 / 24h 均值倍数，任一达标触发），每小时冷却 |
| **告警渠道** | 钉钉 webhook（HMAC 加签）、飞书 webhook（签名）、SMTP 邮件；单渠道失败不影响其他渠道 |
| **仪表盘** | 总消耗 / 调用数 / token 卡片；按天/周/月 × 金额/token × CNY/USD 折线图；按项目/模型/环境分组；调用明细分页 |
| **CSV 报表导出** | 按筛选条件导出，BOM + RFC4180，Excel 双击直开，双币种列齐备 |
| **单租户本地部署** | Docker Compose 一键起，无账号系统（`ADMIN_PASSWORD` 单管理员），移动端适配的简洁后台 |

### 【SaaS 付费增值能力】（闭源占位，本仓库不实现）

- 多租户隔离与账号体系（团队协作、RBAC、邀请入组）
- 云端托管（免运维、公网可达）
- 模型价格库自动同步更新（开源版需手动改 `src/lib/pricing/prices.ts`）
- 汇率自动同步（开源版读 `USD_CNY_RATE` 静态值）
- 高级告警：多渠道聚合、告警升级、短信/企业微信、值班轮转、静默期
- 高级报表：月度对账单、留存策略、发票导出

代码中以 `[SAAS]` 注释标记了所有预留扩展点（见 `prisma/schema.prisma` 顶部、`src/lib/alerts/channels/index.ts` 等）。

## 3. 重要限制说明（必读）

1. **熔断只能拦截新请求**：检查发生在转发上游之前。**正在流式输出中的请求无法被强行终止**——生成方在上游，本网关单方面断流只会让客户端收到截断的响应，而上游已生成的 token 照常计费。因此实际超支上界 ≈ 月预算 + 并发请求数 × 单请求最大成本。详见 `src/lib/gateway/budget.ts` 头注释。
2. **内置价格表是人工快照，会过时**：模型价格随时可能调整（厂商调价、促销、下线），内置表（`src/lib/pricing/prices.ts`）标注了快照日期，不保证实时准确，请以各官网价格页为准。价格过时会导致成本统计偏差。**欢迎 PR 更新价格表**（请附官网依据链接）。计价采用快照原则：每条日志落库当时单价，改表不影响历史账。
3. **估算误差**：上游不返回 `usage` 时（个别自建网关），按字符数粗估 token（默认英文 4 字符/token、中文 1 字符/token），误差可达 ±50%，明细页有"估算"标记。
4. **汇率**：开源版用 `USD_CNY_RATE` 环境变量的静态值换算，不代表实时汇率。
5. **部署形态**：网关依赖长驻 Node 进程在 SSE 流结束后异步落库，**不支持 serverless 平台**（Vercel Functions 等），请用 Docker / 裸机自托管。

## 4. 本地部署教程（Docker）

前置：Docker 与 Docker Compose、Node 20+（生成密钥用）。

```bash
# ① 克隆并进入目录
git clone <本仓库地址> && cd llm-cost-guard

# ② 准备环境变量
cp .env.example .env

# ③ 生成加密密钥（上游 API Key 的 AES-256-GCM 加密用）并写入 .env 的 ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ④ 设置后台密码（ADMIN_PASSWORD，留空则仅本机可访问后台）与数据库密码（POSTGRES_PASSWORD）

# ⑤ 一键启动（Postgres 16 + 网关，启动时自动执行数据库迁移）
docker compose up -d --build

# ⑥ 打开后台
#    http://localhost:3000  （用 ADMIN_PASSWORD 登录）
```

创建第一个项目：后台「项目与密钥」→ 新建项目 → 填上游厂商与 API Key（加密存储，只回掩码）→ 复制弹窗里的 `cgk_` 虚拟 key（**只显示一次**）。

把你的 OpenAI SDK 指向网关：

```bash
export OPENAI_BASE_URL=http://localhost:3000/api/v1
export OPENAI_API_KEY=cgk_xxxxxxxxxxxx
```

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:3000/api/v1", api_key="cgk_xxxx")
resp = client.chat.completions.create(model="deepseek-chat", messages=[{"role": "user", "content": "你好"}])
# 流式加 stream=True 即可，无需其他改动
```

### 不用真实厂商 Key 也能跑通（本地 mock 联调）

```bash
node scripts/mock-upstream.mjs              # 9099 端口的 OpenAI 协议 mock（Bearer sk-mock）
node scripts/mock-upstream.mjs --no-usage   # 不返回 usage，验证估算兜底
```

后台新建项目时选「自定义 OpenAI 兼容网关」，baseUrl 填 `http://localhost:9099/v1`，上游 Key 填 `sk-mock`。

### 本地开发（不走 Docker）

```bash
docker compose up -d postgres   # 只起数据库
npm install
npx prisma migrate dev          # 建表
npm run db:seed                 # （可选）灌演示数据：示例项目 + 14 天模拟账单
npm run dev
```

> Windows + IntelliJ 环境注意事项：`next build`（webpack 管线）可能被 IDE 在 TEMP 目录留下的套接字文件干扰（EACCES）。遇到时改用 `npm run build:turbopack`，或临时关闭 IDE；Linux/Docker 构建不受影响。

## 5. 自部署 vs 托管 SaaS

- **自己部署（本仓库）**：数据完全本地、无外部依赖、MIT 协议随意改。适合个人与团队内网审计自己的 API 开销。
- **不想运维？** 可以使用官方托管 SaaS 站点（多租户隔离、云端价格库自动更新、高级告警与报表）：
  **👉 https://saas.llm-cost-guard.example.com**（占位链接，上线后替换）

## 6. 参与贡献

欢迎 PR！特别欢迎：

- **模型价格更新**：改 `src/lib/pricing/prices.ts`，更新 `PRICES_SNAPSHOT_DATE`，PR 描述附官网价格页链接
- 新上游厂商 baseURL / 兼容性修正（`src/lib/gateway/provider.ts`）
- 告警渠道扩展（企业微信、Server 酱等，注意基础渠道保持开源）
- Bug 修复与 UI 改进

提交前请跑 `npm test && npm run build`。安全相关问题请勿开公开 Issue，直接联系维护者。

---

### 附录：技术栈与目录速览

Next.js 15 (App Router) · TypeScript · Prisma 6 + PostgreSQL 16 · Tailwind CSS v4 · Recharts · nodemailer · vitest

```
src/app/api/v1/chat/completions/route.ts   # ★代理网关（鉴权→熔断→转发→流式解析→计费落库）
src/lib/gateway/    # SSE 解析、预算、估算、流式管道、收尾计费
src/lib/pricing/    # ★内置价格表 + 双币种成本计算
src/lib/alerts/     # 阈值/突增判定、去重、钉钉/飞书/邮件渠道
src/lib/crypto/     # 上游 key AES-256-GCM
src/app/dashboard/  # 概览 / 明细 / 项目密钥 / 告警 后台页面
prisma/schema.prisma# 数据模型（含 [SAAS] 扩展占位注释）
```

常用命令：`npm run dev` 开发 · `npm test` 单测 · `npm run build && npm start` 生产 · `npm run db:seed` 演示数据 · `docker compose up -d --build` 容器部署
