#!/usr/bin/env bash
# Tryon Collector — single-machine deployment script.
# Builds the frontend, then serves everything from one uvicorn process.
#
# Usage:
#   ./scripts/run.sh              # default port 8082
#   PORT=9000 ./scripts/run.sh    # custom port
#   TRYON_DISK_LIMIT_GB=20 ./scripts/run.sh  # custom disk watermark (GB)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${PORT:-8082}"
HOST="${HOST:-0.0.0.0}"

cd "$ROOT_DIR"

echo "▸ Installing dependencies …"
make install

echo "▸ Building frontend …"
make build

echo "▸ Starting server on ${HOST}:${PORT} …"
cd backend
exec uv run uvicorn app.main:app --host "$HOST" --port "$PORT"
