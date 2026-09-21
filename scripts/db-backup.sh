#!/bin/sh
# Nightly backup of the live database (runs in the nadanaloga-db-backup container,
# see deploy/db-stack.yml). Added 2026-09-21 after the incident of 2026-09-19, when
# no backup existed.
#
# Each run: pg_dump (custom format) of nadanaloga-db into /backups, checks the file
# can be listed, deletes copies older than the newest KEEP, and emails the dump to
# BACKUP_EMAIL_TO through the Brevo SMTP relay (skipped if SMTP_USER/SMTP_PASS unset).
# Runs once at start, then every day at RUN_AT_UTC (default 20:30 UTC = 02:00 IST).
#
# Restore a copy into an EMPTY database:
#   pg_restore -U nadanaloga_user -d nadanaloga --no-owner /backups/nadanaloga-YYYY-MM-DD_HHMM.dump

DB_HOST=${DB_HOST:-nadanaloga-db}
DB_NAME=${DB_NAME:-nadanaloga}
DB_USER=${DB_USER:-nadanaloga_user}
BACKUP_DIR=${BACKUP_DIR:-/backups}
KEEP=${KEEP:-30}
RUN_AT_UTC=${RUN_AT_UTC:-20:30}
SMTP_HOST=${SMTP_HOST:-smtp-relay.brevo.com}
SMTP_PORT=${SMTP_PORT:-587}
MAIL_FROM=${MAIL_FROM:-noreply@nadanaloga.com}
BACKUP_EMAIL_TO=${BACKUP_EMAIL_TO:-nadanaloga2026@gmail.com}
export PGPASSWORD="${PGPASSWORD:-$POSTGRES_PASSWORD}"

log() { echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') [backup] $*"; }

send_mail() { # $1 = dump file, $2 = subject, $3 = text
  if [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ]; then
    log "email skipped: SMTP_USER/SMTP_PASS not set"
    return 0
  fi
  command -v curl >/dev/null 2>&1 || apk add --no-cache curl >/dev/null 2>&1 || { log "email FAILED: could not install curl"; return 1; }
  b="nadanaloga-backup-$(date +%s)"
  msg=/tmp/backup-mail.txt
  {
    printf 'From: Nadanaloga Backups <%s>\r\n' "$MAIL_FROM"
    printf 'To: %s\r\n' "$BACKUP_EMAIL_TO"
    printf 'Subject: %s\r\n' "$2"
    printf 'MIME-Version: 1.0\r\n'
    printf 'Content-Type: multipart/mixed; boundary="%s"\r\n\r\n' "$b"
    printf -- '--%s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n\r\n' "$b" "$3"
    printf -- '--%s\r\nContent-Type: application/octet-stream; name="%s"\r\n' "$b" "$(basename "$1")"
    printf 'Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="%s"\r\n\r\n' "$(basename "$1")"
    base64 < "$1" | tr -d '\n' | fold -w 76 | sed 's/$/\r/'
    printf -- '\r\n--%s--\r\n' "$b"
  } > "$msg"
  if curl -sS --max-time 120 --url "smtp://$SMTP_HOST:$SMTP_PORT" --ssl-reqd \
      --user "$SMTP_USER:$SMTP_PASS" --mail-from "$MAIL_FROM" --mail-rcpt "$BACKUP_EMAIL_TO" \
      --upload-file "$msg"; then
    log "emailed to $BACKUP_EMAIL_TO"
  else
    log "email FAILED (the copy on the server is still fine)"
  fi
  rm -f "$msg"
}

run_backup() {
  mkdir -p "$BACKUP_DIR"
  stamp=$(date -u '+%Y-%m-%d_%H%M')
  file="$BACKUP_DIR/nadanaloga-$stamp.dump"
  if ! pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -Fc -f "$file.part"; then
    rm -f "$file.part"
    log "FAILED: pg_dump could not read the database"
    return 1
  fi
  tables=$(pg_restore -l "$file.part" 2>/dev/null | grep -c "TABLE DATA")
  if [ "${tables:-0}" -lt 5 ]; then
    log "FAILED: backup looks incomplete ($tables tables) — kept as $file.part for inspection"
    return 1
  fi
  mv "$file.part" "$file"
  size=$(wc -c < "$file")
  users=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tA -c "SELECT count(*) FROM users" 2>/dev/null)
  log "OK: $file ($size bytes, $tables tables, $users users)"
  ls -1t "$BACKUP_DIR"/nadanaloga-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    rm -f "$old" && log "removed old copy $(basename "$old")"
  done
  send_mail "$file" "Nadanaloga database backup $stamp UTC" \
    "Nightly backup of the Nadanaloga database: $tables tables, $users users, $size bytes. Keep this email — the attachment restores the whole database. The server keeps the last $KEEP copies."
}

seconds_until_next_run() {
  now=$(date -u +%s)
  h=${RUN_AT_UTC%%:*}; m=${RUN_AT_UTC##*:}
  target=$(( now / 86400 * 86400 + ${h#0} * 3600 + ${m#0} * 60 ))
  [ "$target" -gt "$now" ] || target=$(( target + 86400 ))
  echo $(( target - now ))
}

[ "${1:-}" = "once" ] && { run_backup; exit $?; }

log "started; daily at $RUN_AT_UTC UTC, keeping $KEEP copies in $BACKUP_DIR"
until pg_isready -q -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"; do sleep 5; done
run_backup
while true; do
  wait_s=$(seconds_until_next_run)
  log "next backup in $(( wait_s / 3600 ))h $(( wait_s % 3600 / 60 ))m"
  sleep "$wait_s"
  run_backup
done
