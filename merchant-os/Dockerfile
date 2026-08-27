# This Dockerfile is used by ./docker-compose.yml for local development only
# (build context = this folder). Production (Dokploy) builds from the
# separate Dockerfile at the repo root instead, whose context is the repo
# root and whose COPY paths are prefixed with `merchant-os/`. If you change
# the build/runtime logic here, mirror the change there too — see
# README.md "Deployment" section for the full picture.

# ── Stage 1: Install deps + build ────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# prisma.config.ts requires DATABASE_URL to resolve at load time even for
# `generate`/`build`, which don't need a live connection — .env is excluded
# from the build context on purpose, so supply a placeholder here.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate

ARG NEXT_PUBLIC_APP_URL="https://wassla-sd.shop"
ARG APP_RELEASE="unknown"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV APP_RELEASE=$APP_RELEASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL="https://wassla-sd.shop"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG APP_RELEASE="unknown"
ENV APP_RELEASE=$APP_RELEASE

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules  ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next         ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma        ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --chown=nextjs:nodejs package.json   ./
COPY --chown=nextjs:nodejs entrypoint.sh  ./
RUN mkdir -p public/uploads storage/private && chown -R nextjs:nodejs public/uploads storage && \
    sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["./entrypoint.sh"]
