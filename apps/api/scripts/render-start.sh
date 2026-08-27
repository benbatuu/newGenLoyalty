#!/usr/bin/env bash
# Render start: materialize secrets → migrate → boot API.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/materialize-certs.sh bash -c '
  echo "[render-start] prisma migrate deploy"
  npx prisma migrate deploy
  echo "[render-start] starting API"
  exec node dist/src/main.js
'
