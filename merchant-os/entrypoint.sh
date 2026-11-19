#!/bin/sh
set -eu

case "${APP_PROCESS_MODE:-web}" in
  migrate)
    echo "Running the explicit database migration task..."
    exec node node_modules/prisma/build/index.js migrate deploy
    ;;
  web)
    if [ -z "${S3_BUCKET:-}" ] && [ "${PUBLIC_UPLOADS_PERSISTENT:-false}" != "true" ]; then
      echo "Public uploads require a persistent volume or configured object storage."
    fi
    echo "Starting web process without migrations or background billing..."
    exec node node_modules/next/dist/bin/next start
    ;;
  *)
    echo "Invalid APP_PROCESS_MODE; use web or migrate." >&2
    exit 64
    ;;
esac
