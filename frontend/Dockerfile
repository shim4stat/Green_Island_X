# ===== Build Stage =====
FROM node:22-alpine AS builder

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json package-lock.json* ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# 環境変数はビルド時に必要（ARGで受け取る）
ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002

ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_DEFAULT_CHAIN_ID=$NEXT_PUBLIC_DEFAULT_CHAIN_ID

# Next.js をビルド
RUN npm run build

# ===== Production Stage =====
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 所有者を変更
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Next.js standalone server の設定
# HOSTNAME を 0.0.0.0 に設定して外部からのアクセスを許可
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
