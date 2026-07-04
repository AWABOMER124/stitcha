# This is the Dockerfile Dokploy actually builds in production (build
# context = repo root, see COPY paths below). A second, deliberately parallel
# Dockerfile lives at merchant-os/Dockerfile for local `docker-compose up`
# from inside merchant-os/ (context = merchant-os/ itself, no path prefix).
# If you change the build/runtime logic here, mirror the change there too —
# see merchant-os/README.md "Deployment" section for the full picture.

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY merchant-os/package.json merchant-os/package-lock.json* ./
RUN npm ci

COPY merchant-os/ .

# prisma.config.ts resolves DATABASE_URL eagerly via env() on every Prisma
# CLI call, but .env is intentionally excluded from the build context, so
# `generate`/`build` fail at build time without a live DB — placeholder only.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json   ./
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh  ./
RUN chmod +x entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
