#!/bin/sh
# Recovery step 2 of 2 — 2026-09-19 incident. Run after fix1.sh and a Postgres restart:
#   wget -qO- https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/fix2.sh | sh
#
# Shows what came back, adds the primary keys and moves the id sequences past the
# highest id. It never UPDATEs rows: a row rewritten before the app re-adds its later
# columns (studio, time_slots, course_id, receipt_number, ...) would lose those values.

DB=${DB:-nadanaloga}
U=${DBUSER:-nadanaloga_user}
TABLES="batches fee_structures demo_bookings invoices invoice_payments"

export PGOPTIONS='-c statement_timeout=60s'
q() { psql -tA -U "$U" -d "$DB" -c "$1"; }

echo "== Recovery step 2 =="
echo ""
echo "Rows recovered:"
for t in $TABLES; do
  c=$(q "SELECT count(*) FROM $t" 2>&1)
  echo "  $t: $c"
done

echo ""
echo "Primary keys and id counters:"
for t in $TABLES; do
  has=$(q "SELECT count(*) FROM pg_constraint WHERE conrelid='public.$t'::regclass AND contype='p'")
  if [ "$has" = "0" ]; then
    r=$(q "ALTER TABLE $t ADD CONSTRAINT ${t}_pk PRIMARY KEY (id)" 2>&1) && r="key added" || r="key FAILED: $r"
  else
    r="key already there"
  fi
  s=$(q "SELECT setval('${t}_id_seq', GREATEST((SELECT COALESCE(max(id),1) FROM $t), (SELECT last_value FROM ${t}_id_seq)))" 2>&1)
  echo "  $t: $r, next id after $s"
done

echo ""
echo "Latest records:"
q "SELECT 'last bill: ' || COALESCE(max(created_at)::text,'none') FROM invoices"
q "SELECT 'bills by status: ' || COALESCE(string_agg(status || '=' || n, ', '),'none') FROM (SELECT status, count(*) n FROM invoices GROUP BY status) s"
q "SELECT 'last payment: ' || COALESCE(max(submitted_at)::text,'none') FROM invoice_payments"
q "SELECT 'last demo booking: ' || COALESCE(max(created_at)::text,'none') FROM demo_bookings"

echo ""
echo "Step 2 DONE. Now start the app: Containers -> nadanaloga-main-app -> Start."
