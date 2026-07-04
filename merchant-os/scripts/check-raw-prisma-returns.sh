#!/bin/sh
# Heuristic guard against the Decimal-serialization bug class that crashed
# /admin and the public storefront (Prisma's Decimal can't cross a Server
# Action / Server->Client boundary — see src/lib/serialization/).
#
# This flags repository/service functions that `return prisma.X.findMany/
# findFirst/findUnique/create/update(...)` DIRECTLY, with no intermediate
# variable to pass through serializePrismaObject/Array first. Every fix this
# session followed the same shape: `const x = await prisma...; return
# serializePrismaObject(x);` — so a bare `return prisma.` is worth a manual
# look, even if the underlying model turns out to have no Decimal field.
#
# This is intentionally simple grep, not a real static analyzer: expect the
# occasional false positive (models with no Decimal field), and treat a
# clean run as "nothing obviously new," not a correctness guarantee.
#
# Usage: sh scripts/check-raw-prisma-returns.sh

cd "$(dirname "$0")/.." || exit 1

MATCHES=$(grep -rnE "return (await )?prisma\.[a-zA-Z]+\.(findMany|findFirst|findUnique|create|update|upsert)\(" \
  src/modules --include="*.ts" 2>/dev/null)

if [ -z "$MATCHES" ]; then
  echo "✓ No bare 'return prisma....' patterns found in src/modules."
  exit 0
fi

echo "⚠ Found repository/service returns that skip serialization — review each:"
echo "$MATCHES"
exit 1
