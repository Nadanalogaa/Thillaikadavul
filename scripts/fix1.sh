#!/bin/sh
# Recovery step 1 of 2 — 2026-09-19 incident.
#
# After a Postgres crash, the catalog (pg_class) rows of five tables vanished
# while their data files, column definitions (pg_attribute), row types, sequences,
# primary-key indexes and TOAST tables all survived. This script:
#   1. frees the old names held by the leftover row types (renamed *_lost),
#   2. creates each table again with the exact surviving column layout,
#   3. copies the old data file over the new table's empty file.
# Then restart the Postgres container and run fix2.sh.
#
# Run INSIDE the postgres container (Portainer console, /bin/sh) with the app stopped:
#   wget -qO- https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/fix1.sh | sh
# It refuses to change anything if the situation is not exactly the expected one.

DB=${DB:-nadanaloga}
U=${DBUSER:-nadanaloga_user}
TABLES="batches fee_structures demo_bookings invoices invoice_payments"

q() { psql -v ON_ERROR_STOP=1 -tA -U "$U" -d "$DB" -c "$1"; }
stop() { echo ""; echo "STOP: $1"; echo "Nothing was changed. Send a screenshot of this to Claude."; exit 1; }

echo "== Recovery step 1 =="

others=$(q "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB' AND pid <> pg_backend_pid() AND backend_type='client backend'") || stop "cannot connect to the database"
[ "$others" = "0" ] || stop "$others other connection(s) open — stop nadanaloga-main-app first"

existing=$(q "SELECT count(*) FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace AND relname IN ('batches','fee_structures','demo_bookings','invoices','invoice_payments')")
[ "$existing" = "0" ] || stop "$existing of these tables already exist (already recovered?)"

DATADIR=$(q "SHOW data_directory")
DBOID=$(q "SELECT oid FROM pg_database WHERE datname='$DB'")
BASE="$DATADIR/base/$DBOID"

PAIRS=""
OIDS=""
for t in $TABLES; do
  o=$(q "SELECT typrelid FROM pg_type WHERE typname='$t' AND typrelid <> 0 AND typnamespace='public'::regnamespace")
  [ -n "$o" ] || stop "no leftover entry found for $t"
  [ -f "$BASE/$o" ] || stop "data file for $t ($BASE/$o) is missing"
  PAIRS="$PAIRS $t:$o"
  OIDS="${OIDS:+$OIDS,}$o"
done
echo "Old tables found:$PAIRS"

psql -v ON_ERROR_STOP=1 -U "$U" -d "$DB" <<EOF || stop "creating the tables failed (rolled back)"
BEGIN;
UPDATE pg_type SET typname = typname || '_lost'
 WHERE typrelid IN ($OIDS)
    OR typelem IN (SELECT oid FROM pg_type WHERE typrelid IN ($OIDS));
CREATE TABLE batches (id integer NOT NULL DEFAULT nextval('batches_id_seq'), batch_name varchar(255), course_id integer, teacher_id integer, schedule text, start_date date, end_date date, max_students integer, student_ids integer[], mode varchar(50) DEFAULT 'Hybrid', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), location_id integer, days text[] DEFAULT ARRAY[]::text[], start_time time, end_time time);
CREATE TABLE fee_structures (id integer NOT NULL DEFAULT nextval('fee_structures_id_seq'), course_id integer, mode varchar(50), monthly_fee numeric(10,2), quarterly_fee numeric(10,2), half_yearly_fee numeric(10,2), annual_fee numeric(10,2), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), batch_ids integer[] DEFAULT ARRAY[]::integer[]);
CREATE TABLE demo_bookings (id integer NOT NULL DEFAULT nextval('demo_bookings_id_seq'), student_name varchar(255), parent_name varchar(255), email varchar(255), phone varchar(20), course varchar(255), preferred_date date, preferred_time time, location varchar(255), notes text, status varchar(50) DEFAULT 'pending', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE invoices (id integer NOT NULL DEFAULT nextval('invoices_id_seq'), student_id integer, fee_structure_id integer, course_name varchar(255), amount numeric(10,2), currency varchar(10) DEFAULT 'INR', issue_date date, due_date date, billing_period varchar(100), status varchar(50) DEFAULT 'pending', payment_details jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), original_amount numeric(10,2), discount_percentage numeric(5,2), discount_amount numeric(10,2), last_reminder_date date);
CREATE TABLE invoice_payments (id integer NOT NULL DEFAULT nextval('invoice_payments_id_seq'), invoice_id integer, student_id integer, amount numeric(10,2), payment_method varchar(50) DEFAULT 'UPI', transaction_id varchar(255), payment_date date, proof_url text, status varchar(50) DEFAULT 'submitted', notes text, submitted_at timestamptz DEFAULT now(), approved_at timestamptz, updated_at timestamptz DEFAULT now());
COMMIT;
CHECKPOINT;
EOF

echo ""
echo "Copying old data into the new tables:"
for p in $PAIRS; do
  t=${p%%:*}; o=${p##*:}
  n=$(q "SELECT relfilenode FROM pg_class WHERE relname='$t' AND relkind='r' AND relnamespace='public'::regnamespace")
  if [ -z "$n" ] || [ ! -f "$BASE/$n" ]; then echo "  $t: new file not found — SKIPPED"; continue; fi
  cat "$BASE/$o" > "$BASE/$n"
  echo "  $t: $(wc -c < "$BASE/$o") bytes -> $(wc -c < "$BASE/$n") bytes"
done

echo ""
echo "Step 1 DONE. Now: Containers -> nadanaloga-main-postgres -> Restart. Then run step 2:"
echo "  wget -qO- https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/fix2.sh | sh"
