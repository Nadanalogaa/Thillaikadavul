-- Removes everything scripts/create-test-accounts.sql made, plus anything done
-- with those accounts while testing: their bills and payments, attendance,
-- class sessions of TEST Batch, notifications, devices, sessions.
-- Only rows belonging to the TEST accounts (phones 9999900001 / 9999900002)
-- and "TEST Batch (testing only)" are touched.
--   curl -s https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/remove-test-accounts.sql \
--   | docker exec -i nadanaloga-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
BEGIN;
CREATE TEMP TABLE test_users AS
    SELECT id FROM users
     WHERE contact_number IN ('9999900001', '9999900002')
       AND name IN ('TEST Teacher', 'TEST Parent', 'TEST Student');
CREATE TEMP TABLE test_batches AS
    SELECT id FROM batches WHERE batch_name = 'TEST Batch (testing only)';

SELECT 'removing' AS what, (SELECT count(*) FROM test_users) AS users, (SELECT count(*) FROM test_batches) AS batches;

DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE student_id IN (SELECT id FROM test_users));
DELETE FROM invoices WHERE student_id IN (SELECT id FROM test_users);
DELETE FROM attendance WHERE student_id IN (SELECT id FROM test_users);
DELETE FROM attendance WHERE session_id IN (SELECT id FROM class_sessions WHERE batch_id IN (SELECT id FROM test_batches));
DELETE FROM class_sessions WHERE batch_id IN (SELECT id FROM test_batches);
DELETE FROM batches WHERE id IN (SELECT id FROM test_batches);
UPDATE batches SET student_ids = array_remove(student_ids, t.id) FROM test_users t WHERE t.id = ANY(batches.student_ids);
DELETE FROM student_course_grades WHERE student_id IN (SELECT id FROM test_users);
DELETE FROM notifications WHERE user_id IN (SELECT id FROM test_users);
DELETE FROM user_fcm_tokens WHERE user_id IN (SELECT id FROM test_users);
DELETE FROM users WHERE id IN (SELECT id FROM test_users WHERE id IN (SELECT id FROM users WHERE parent_id IS NOT NULL));
DELETE FROM users WHERE id IN (SELECT id FROM test_users);
COMMIT;
