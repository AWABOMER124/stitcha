#!/bin/sh
set -e

# Fresh database: `migrate deploy` applies 0_init (the full schema baseline).
#
# NOTE: If you are deploying against a database whose schema was created with
# `prisma db push` (no migration history), baseline it ONCE before the first
# deploy so migrate does not try to re-create existing tables:
#   npx prisma migrate resolve --applied 0_init
echo "▶ Running database migrations..."
npx prisma migrate deploy

if [ -z "$S3_BUCKET" ] && [ "$PUBLIC_UPLOADS_PERSISTENT" != "true" ]; then
  echo "⚠ Public uploads use local disk without a declared persistent volume. Set PUBLIC_UPLOADS_PERSISTENT=true only after mounting /app/public/uploads."
fi

echo "▶ Starting application..."
exec node node_modules/next/dist/bin/next start
