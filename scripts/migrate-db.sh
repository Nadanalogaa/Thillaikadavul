#!/bin/sh
# Copy the live data from the old database (nadanaloga-main-postgres) into the new
# dedicated one (nadanaloga-db) — 2026-09-21, after the shared-volume incident.
#
# Run INSIDE the nadanaloga-db container (Portainer console, /bin/sh), with
# nadanaloga-main-app STOPPED so nothing changes during the copy:
#   wget -qO- https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/migrate-db.sh | OLDPW='<db password>' sh
#
# Left out on purpose: password_reset_otps (short-lived codes; its catalog entry is
# damaged; the app recreates the table) and the stored values of the id sequences
# (some are unreadable) — every sequence is reset to max(id)+1 afterwards.

OLD_HOST=${OLD_HOST:-nadanaloga-main-postgres}
U=${DBUSER:-nadanaloga_user}
DB=${DB:-nadanaloga}
OLD_DB=${OLD_DB:-$DB}
DUMP=${DUMP:-/var/lib/postgresql/data/migrated-from-old-20260921.dump}

stop() { echo ""; echo "STOP: $1"; echo "Send a screenshot of this to Claude."; exit 1; }
q() { psql -v ON_ERROR_STOP=1 -tA -U "$U" -d "$DB" -c "$1"; }

echo "== Moving live data to the new database =="
[ -n "$OLDPW" ] || stop "the password was not given (OLDPW='...')"

tables=$(q "SELECT count(*) FROM pg_tables WHERE schemaname='public'") || stop "cannot open the new database"
[ "$tables" = "0" ] || stop "the new database already has $tables tables — nothing was changed"

old_clients=$(PGPASSWORD="$OLDPW" psql -h "$OLD_HOST" -U "$U" -d "$OLD_DB" -tA -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$OLD_DB' AND pid <> pg_backend_pid() AND backend_type='client backend'") \
  || stop "cannot reach the old database at $OLD_HOST (wrong password?)"
[ "$old_clients" = "0" ] || stop "$old_clients connection(s) still open on the old database — stop nadanaloga-main-app first"

echo "1/4 Reading the old database..."
PGPASSWORD="$OLDPW" pg_dump -h "$OLD_HOST" -U "$U" -d "$OLD_DB" -Fc --no-owner \
  --exclude-table-data='*_seq' -T password_reset_otps -T password_reset_otps_id_seq \
  -f "$DUMP" || stop "reading the old database failed"
echo "    $(wc -c < "$DUMP") bytes, $(pg_restore -l "$DUMP" | grep -c 'TABLE DATA') tables"

echo "2/4 Writing into the new database..."
pg_restore -U "$U" -d "$DB" --no-owner "$DUMP" 2> /tmp/restore-errors.txt
errs=$(grep -c "error:" /tmp/restore-errors.txt)
echo "    restore finished with $errs error(s)"
[ "$errs" = "0" ] || head -20 /tmp/restore-errors.txt

echo "3/4 Resetting id counters..."
psql -v ON_ERROR_STOP=1 -U "$U" -d "$DB" <<'EOF' || stop "resetting counters failed"
DO $$
DECLARE r record; m bigint;
BEGIN
  FOR r IN
    SELECT s.oid::regclass AS seq, a.attrelid::regclass AS tbl, a.attname AS col
    FROM pg_class s
    JOIN pg_depend d ON d.classid = 'pg_class'::regclass AND d.objid = s.oid
                    AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a','i')
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
  LOOP
    EXECUTE format('SELECT max(%I) FROM %s', r.col, r.tbl) INTO m;
    PERFORM setval(r.seq, COALESCE(m, 0) + 1, false);
  END LOOP;
  -- Receipt numbers (NDA-R-000123) come from a sequence no column owns.
  IF to_regclass('payment_receipt_seq') IS NOT NULL AND to_regclass('invoice_payments') IS NOT NULL THEN
    SELECT max(substring(receipt_number FROM '([0-9]+)$')::bigint) INTO m FROM invoice_payments;
    PERFORM setval('payment_receipt_seq', COALESCE(m, 0) + 1, false);
  END IF;
  -- Student ids (NDA-2026-0042) come from user_id_seq, also not owned by a column.
  IF to_regclass('user_id_seq') IS NOT NULL THEN
    SELECT max(substring(user_id FROM '([0-9]+)$')::bigint) INTO m FROM users;
    PERFORM setval('user_id_seq', COALESCE(m, 0) + 1, false);
  END IF;
END $$;
EOF
unowned=$(q "SELECT string_agg(relname, ', ') FROM pg_class c WHERE relkind='S' AND relname NOT IN ('payment_receipt_seq','user_id_seq') AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype IN ('a','i'))")
[ -z "$unowned" ] || echo "    note: counters not tied to a table (left as they are): $unowned"

echo "4/4 Comparing old and new..."
for t in users courses batches fee_structures invoices invoice_payments demo_bookings events notices; do
  old=$(PGPASSWORD="$OLDPW" psql -h "$OLD_HOST" -U "$U" -d "$OLD_DB" -tA -c "SELECT count(*) FROM $t" 2>/dev/null)
  new=$(q "SELECT count(*) FROM $t" 2>/dev/null)
  mark="OK"; [ "$old" = "$new" ] || mark="DIFFERENT"
  printf "    %-18s old=%-6s new=%-6s %s\n" "$t" "$old" "$new" "$mark"
done

echo ""
echo "DONE. Next: Stacks -> nadanaloga-main -> add environment variable DB_HOST = nadanaloga-db -> Update the stack (re-pull and redeploy)."
