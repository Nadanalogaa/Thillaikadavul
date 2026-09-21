#!/bin/sh
# Follow-up to migrate-db.sh (2026-09-21): restore grades and student_course_grades.
# In the old database their id sequences had lost the link to the column, so the dump
# created each table before its sequence and both CREATE TABLEs failed. The sequences
# exist now, so restoring just these two tables' entries from the same dump works.
#
# Run INSIDE the nadanaloga-db container with nadanaloga-main-app stopped:
#   wget -qO- https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/migrate-fix-grades.sh | OLDPW='<db password>' sh

OLD_HOST=${OLD_HOST:-nadanaloga-main-postgres}
U=${DBUSER:-nadanaloga_user}
DB=${DB:-nadanaloga}
OLD_DB=${OLD_DB:-$DB}
DUMP=${DUMP:-/var/lib/postgresql/data/migrated-from-old-20260921.dump}

stop() { echo ""; echo "STOP: $1"; echo "Send a screenshot of this to Claude."; exit 1; }
q() { psql -v ON_ERROR_STOP=1 -tA -U "$U" -d "$DB" -c "$1"; }

echo "== Restoring grades and student_course_grades =="
[ -f "$DUMP" ] || stop "backup file $DUMP not found — run migrate-db.sh first"
have=$(q "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('grades','student_course_grades')") || stop "cannot open the new database"
[ "$have" = "0" ] || stop "these tables already exist in the new database ($have) — nothing was changed"

pg_restore -l "$DUMP" | grep -E " public (student_course_)?grades " > /tmp/grades.list
echo "Entries to restore: $(wc -l < /tmp/grades.list)"
pg_restore -U "$U" -d "$DB" --no-owner -L /tmp/grades.list "$DUMP" 2> /tmp/grades-errors.txt
errs=$(grep "error:" /tmp/grades-errors.txt | grep -vc "already exists")
echo "Finished with $errs error(s)"
[ "$errs" = "0" ] || grep -A3 "error:" /tmp/grades-errors.txt | grep -v "already exists" | head -20

psql -v ON_ERROR_STOP=1 -U "$U" -d "$DB" <<'EOF' || stop "linking the id counters failed"
ALTER SEQUENCE grades_id_seq OWNED BY grades.id;
ALTER SEQUENCE student_course_grades_id_seq OWNED BY student_course_grades.id;
SELECT setval('grades_id_seq', COALESCE((SELECT max(id) FROM grades), 0) + 1, false);
SELECT setval('student_course_grades_id_seq', COALESCE((SELECT max(id) FROM student_course_grades), 0) + 1, false);
EOF

echo "Comparing old and new:"
for t in grades student_course_grades; do
  old=$(PGPASSWORD="$OLDPW" psql -h "$OLD_HOST" -U "$U" -d "$OLD_DB" -tA -c "SELECT count(*) FROM $t" 2>/dev/null)
  new=$(q "SELECT count(*) FROM $t" 2>/dev/null)
  mark="OK"; [ "$old" = "$new" ] || mark="DIFFERENT"
  printf "    %-22s old=%-6s new=%-6s %s\n" "$t" "$old" "$new" "$mark"
done
echo ""
echo "DONE. Next: Stacks -> nadanaloga-main -> add environment variable DB_HOST = nadanaloga-db -> Update the stack (re-pull and redeploy)."
