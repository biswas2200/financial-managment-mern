#!/bin/bash
# Executed by the official mongo image on first start (empty /data/db only).
# Restores the committed Kosha seed dataset so a fresh clone has data immediately.

ARCHIVE=/dump/kosha.archive.gz

if [ -f "$ARCHIVE" ]; then
  echo "[kosha] Restoring seed dataset from $ARCHIVE ..."
  mongorestore \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --gzip --archive="$ARCHIVE" \
    --nsInclude='kosha.*' \
    --drop
  echo "[kosha] Restore complete."
else
  echo "[kosha] No dump at $ARCHIVE. Skipping restore (run: npm run seed)."
fi
