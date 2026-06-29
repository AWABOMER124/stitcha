#!/bin/sh
set -e

echo "▶ Marking migrations as applied (idempotent)..."
npx prisma migrate resolve --applied 20260627000000_add_distributor_and_store_type 2>/dev/null || true

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Starting application..."
exec npm start
