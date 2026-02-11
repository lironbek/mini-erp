#!/bin/bash
# Database Backup Script
# Usage: ./scripts/backup-db.sh
#
# Requires: pg_dump, BACKUP_DIR env var (default: ./backups)
# Can be run as a cron job for automated daily backups

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mini-erp_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."

# Load DATABASE_URL from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

# Run pg_dump and compress
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "mini-erp_*.sql.gz" -mtime +30 -delete
echo "🧹 Old backups cleaned (>30 days)"

# Verify backup
if [ -s "$BACKUP_FILE" ]; then
  echo "✅ Backup verification: OK"
else
  echo "❌ Backup verification: FAILED (file is empty)"
  exit 1
fi
