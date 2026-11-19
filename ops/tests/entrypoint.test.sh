#!/bin/sh
set -eu
base="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -f "$test_dir/node" "$test_dir/exec.log"; rmdir "$test_dir"' EXIT
cat > "$test_dir/node" <<'NODE'
#!/bin/sh
printf '%s\n' "$*" >> "$TEST_EXEC_LOG"
NODE
chmod +x "$test_dir/node"
export PATH="$test_dir:$PATH" TEST_EXEC_LOG="$test_dir/exec.log"
APP_PROCESS_MODE=web PUBLIC_UPLOADS_PERSISTENT=true sh "$base/merchant-os/entrypoint.sh" >/dev/null
[ "$(cat "$TEST_EXEC_LOG")" = 'node_modules/next/dist/bin/next start' ]
: > "$TEST_EXEC_LOG"
APP_PROCESS_MODE=migrate sh "$base/merchant-os/entrypoint.sh" >/dev/null
[ "$(cat "$TEST_EXEC_LOG")" = 'node_modules/prisma/build/index.js migrate deploy' ]
: > "$TEST_EXEC_LOG"
if APP_PROCESS_MODE=invalid sh "$base/merchant-os/entrypoint.sh" >/dev/null 2>&1; then exit 1; else [ "$?" = 64 ]; fi
[ ! -s "$TEST_EXEC_LOG" ]
printf '%s\n' 'PASS: web never migrates; explicit migration exits; invalid mode fails closed'
