#!/usr/bin/env bash
# Writes the current `kosha` database (minus chat history) to database/dump/kosha.archive.gz.
# docker-compose restores this archive automatically on a fresh volume.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="database/dump/kosha.archive.gz"
mkdir -p "$(dirname "$OUT")"

docker exec kosha-mongo mongodump \
  --username "${MONGO_ROOT_USER:-kosha}" \
  --password "${MONGO_ROOT_PASSWORD:-kosha_dev_pw}" \
  --authenticationDatabase admin \
  --db kosha \
  --excludeCollection assistantmessages \
  --gzip --archive > "$OUT"

echo "[dump] Wrote $OUT ($(du -h "$OUT" | cut -f1))"
