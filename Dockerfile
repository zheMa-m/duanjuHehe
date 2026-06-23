# ──────────────────────────────────────────────
# HeHe App — 多阶段 Docker 构建
# Node 20 Alpine 基础镜像（~130MB 最终产物）
# ──────────────────────────────────────────────

# ---- Stage 1: 依赖安装 ----
FROM node:20-alpine AS deps
WORKDIR /app

# 单独复制 lockfile 以利用缓存
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- Stage 2: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建生产产物
RUN npm run build

# ---- Stage 3: 运行时 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# 从构建阶段复制产物
COPY --from=builder /app/.output ./

EXPOSE 3000

# Nitro 启动入口
CMD ["node", "./server/index.mjs"]
