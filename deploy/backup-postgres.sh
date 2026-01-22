#!/bin/bash
# PostgreSQL Backup Script for Portainer Containers
# Usage: ./backup-postgres.sh [container-name] [backup-dir]
#
# This script creates timestamped backups of your PostgreSQL database
# and automatically cleans up old backups (keeps last 7 days)

set -e

# Configuration
CONTAINER_NAME="${1:-nadanaloga-sub-postgres}"
BACKUP_DIR="${2:-./backups}"
DB_NAME="nadanaloga"
DB_USER="postgres"
RETENTION_DAYS=7

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/${CONTAINER_NAME}_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="$BACKUP_DIR/${CONTAINER_NAME}_${TIMESTAMP}.sql.gz"

echo "========================================="
echo "PostgreSQL Backup Script"
echo "========================================="
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "Backup directory: $BACKUP_DIR"
echo "Timestamp: $TIMESTAMP"
echo "========================================="

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '$CONTAINER_NAME' is not running!"
    echo "Available running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo ""
echo "Step 1: Creating database backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✓ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

echo ""
echo "Step 2: Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_SIZE=$(du -h "$BACKUP_COMPRESSED" | cut -f1)
echo "✓ Compressed: $BACKUP_COMPRESSED ($COMPRESSED_SIZE)"

echo ""
echo "Step 3: Verifying backup integrity..."
if gunzip -t "$BACKUP_COMPRESSED" 2>/dev/null; then
    echo "✓ Backup file integrity verified"
else
    echo "✗ Warning: Backup file may be corrupted!"
    exit 1
fi

echo ""
echo "Step 4: Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
DELETED_COUNT=0
if [ -d "$BACKUP_DIR" ]; then
    # Find and delete backups older than retention period
    while IFS= read -r old_backup; do
        if [ -n "$old_backup" ]; then
            echo "  Deleting: $(basename "$old_backup")"
            rm "$old_backup"
            ((DELETED_COUNT++))
        fi
    done < <(find "$BACKUP_DIR" -name "${CONTAINER_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS)

    if [ $DELETED_COUNT -eq 0 ]; then
        echo "✓ No old backups to delete"
    else
        echo "✓ Deleted $DELETED_COUNT old backup(s)"
    fi
fi

echo ""
echo "Step 5: Backup summary..."
echo "Current backups in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/${CONTAINER_NAME}_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'

TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/${CONTAINER_NAME}_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo ""
echo "Total backups: $TOTAL_BACKUPS"
echo "Total size: $TOTAL_SIZE"

echo ""
echo "========================================="
echo "✓ Backup completed successfully!"
echo "========================================="
echo ""
echo "Backup location: $BACKUP_COMPRESSED"
echo "Compressed size: $COMPRESSED_SIZE"
echo ""
echo "To restore this backup:"
echo "  gunzip -c $BACKUP_COMPRESSED | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo ""
