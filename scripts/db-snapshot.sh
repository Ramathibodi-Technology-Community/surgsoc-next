#!/usr/bin/env bash
# Logical snapshot of the database named by DATABASE_URL_UNPOOLED (falls back to
# DATABASE_URL). Read-only: pg_dump takes no write locks and changes nothing.
#
#   pnpm db:snapshot [label]        -> backups/<utc-timestamp>-<label>.dump
#
# Use the UNPOOLED url. pg_dump through Neon's pgbouncer pooler fails or dumps
# an inconsistent view. Needs a pg_dump at least as new as the server.
# Restore steps live in docs/db-backup-and-rollback.md.
set -euo pipefail

url="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
if [ -z "$url" ]; then
  echo "db-snapshot: set DATABASE_URL_UNPOOLED (or DATABASE_URL)." >&2
  exit 1
fi

label="${1:-manual}"
out_dir="${BACKUP_DIR:-backups}"
mkdir -p "$out_dir"
out="$out_dir/$(date -u +%Y%m%dT%H%M%SZ)-${label//[^A-Za-z0-9._-]/_}.dump"

trap 'rm -f "$out"' ERR

# Custom format: compressed, and pg_restore can pick tables or restore in parallel.
# --no-owner/--no-privileges so it restores into any role (a Neon branch, local docker).
pg_dump --format=custom --no-owner --no-privileges --file="$out" "$url"

# A dump that cannot be listed is not a backup.
tables=$(pg_restore --list "$out" | grep -c ' TABLE DATA ' || true)
if [ "$tables" -lt 1 ]; then
  echo "db-snapshot: $out has no table data, treating it as failed." >&2
  rm -f "$out"
  exit 1
fi

echo "db-snapshot: wrote $out ($(du -h "$out" | cut -f1), $tables tables with data)"
