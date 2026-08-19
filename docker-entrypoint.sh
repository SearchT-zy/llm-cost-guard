#!/bin/sh
# 容器入口：先应用数据库迁移，再启动 Next standalone 服务。
# 注意：本文件必须保持 LF 行尾（CRLF 会导致 "no such file or directory" 启动失败），
# 仓库已配 .gitattributes 强制 LF。
set -e

echo "[entrypoint] prisma migrate deploy ..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] starting llm-cost-guard ..."
exec node server.js
