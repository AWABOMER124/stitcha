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

echo "▶ Starting application..."
exec npm start
