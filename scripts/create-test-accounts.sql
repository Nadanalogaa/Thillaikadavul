-- Test accounts for trying every screen on the live site without touching a
-- real family. Creates (once — running it again only resets the password):
--   TEST Teacher  login 9999900001  teaches "TEST Batch" (Drawing)
--   TEST Parent   login 9999900002  with child "TEST Student" in TEST Batch
-- TEST Batch meets EVERY day 6-7 PM, so attendance can be marked any day.
-- TEST Student is in Drawing · Pre-Grade from 1 Nov, so this month's bill is
-- created by the server's billing run (within 6 hours, or Admin -> Fees ->
-- generate) and the pay / "I've paid" flow can be tried.
-- Email addresses are stand-ins (…nadanaloga.local): nothing is ever mailed.
--
-- The password is passed on the command line, never stored in this file:
--   curl -s https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/scripts/create-test-accounts.sql \
--   | docker exec -i nadanaloga-db sh -c 'psql -v ON_ERROR_STOP=1 -v pw="Test@2026" -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
-- Remove everything afterwards with scripts/remove-test-accounts.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT set_config('nada.test_pw', :'pw', false);

DO $$
DECLARE
    pw_hash   text := crypt(current_setting('nada.test_pw'), gen_salt('bf', 10));
    yr        text := to_char(now(), 'YYYY');
    v_course  int;
    v_grade   int;
    v_teacher int;
    v_parent  int;
    v_child   int;
    v_batch   int;
BEGIN
    IF length(current_setting('nada.test_pw')) < 6 THEN
        RAISE EXCEPTION 'Choose a password of at least 6 characters (pw=...)';
    END IF;

    SELECT id INTO v_course FROM courses WHERE name = 'Drawing';
    SELECT id INTO v_grade FROM grades WHERE course_id = v_course AND name = 'Pre-Grade';
    IF v_course IS NULL OR v_grade IS NULL THEN
        RAISE EXCEPTION 'Course Drawing / grade Pre-Grade not found';
    END IF;

    -- Teacher
    SELECT id INTO v_teacher FROM users WHERE contact_number = '9999900001' AND role = 'Teacher' AND is_deleted = false;
    IF v_teacher IS NULL THEN
        INSERT INTO users (name, email, password, role, status, contact_number, course_expertise, employment_type,
                           user_id, is_primary, must_change_password, date_of_joining, class_preference)
        VALUES ('TEST Teacher', 'test-teacher-' || yr || '@staff.nadanaloga.local', pw_hash, 'Teacher', 'active', '9999900001',
                '["Drawing"]', 'Part-time',
                'NDA-' || yr || '-' || lpad(nextval('user_id_seq')::text, 4, '0'), true, false, DATE '2026-11-01', 'Offline')
        RETURNING id INTO v_teacher;
        RAISE NOTICE 'Created TEST Teacher (id %)', v_teacher;
    ELSE
        UPDATE users SET password = pw_hash, must_change_password = false WHERE id = v_teacher;
        RAISE NOTICE 'TEST Teacher exists (id %), password reset', v_teacher;
    END IF;

    -- Parent
    SELECT id INTO v_parent FROM users WHERE contact_number = '9999900002' AND role = 'Parent' AND is_deleted = false;
    IF v_parent IS NULL THEN
        INSERT INTO users (name, email, password, role, status, contact_number, address, user_id, is_primary,
                           must_change_password, date_of_joining, class_preference)
        VALUES ('TEST Parent', 'test-parent-' || yr || '@parent.nadanaloga.local', pw_hash, 'Parent', 'active', '9999900002',
                'Test address (not a real family)',
                'NDA-' || yr || '-' || lpad(nextval('user_id_seq')::text, 4, '0'), true, false, DATE '2026-11-01', 'Offline')
        RETURNING id INTO v_parent;
        RAISE NOTICE 'Created TEST Parent (id %)', v_parent;
    ELSE
        UPDATE users SET password = pw_hash, must_change_password = false WHERE id = v_parent;
        RAISE NOTICE 'TEST Parent exists (id %), password reset', v_parent;
    END IF;

    -- Child (no login of its own; the parent signs in)
    SELECT id INTO v_child FROM users WHERE parent_id = v_parent AND name = 'TEST Student' AND is_deleted = false;
    IF v_child IS NULL THEN
        INSERT INTO users (name, email, password, role, status, contact_number, courses, father_name, standard,
                           grade, class_preference, date_of_joining, user_id, parent_id, is_primary, must_change_password)
        VALUES ('TEST Student', 'pending@child.nadanaloga.local', crypt(gen_random_uuid()::text, gen_salt('bf', 10)),
                'Student', 'active', '9999900002', '["Drawing"]', 'TEST Parent', '5th', 'Pre-Grade', 'Offline',
                DATE '2026-11-01', 'NDA-' || yr || '-' || lpad(nextval('user_id_seq')::text, 4, '0'),
                v_parent, false, false)
        RETURNING id INTO v_child;
        UPDATE users SET email = lower(user_id) || '@child.nadanaloga.local' WHERE id = v_child;
        RAISE NOTICE 'Created TEST Student (id %)', v_child;
    END IF;

    INSERT INTO student_course_grades (student_id, course_id, grade_id)
    VALUES (v_child, v_course, v_grade)
    ON CONFLICT (student_id, course_id) DO UPDATE SET grade_id = EXCLUDED.grade_id;

    -- Batch, every day 6-7 PM
    SELECT id INTO v_batch FROM batches WHERE batch_name = 'TEST Batch (testing only)';
    IF v_batch IS NULL THEN
        INSERT INTO batches (batch_name, course_id, teacher_id, schedule, student_ids, mode, days, start_time, end_time,
                             studio, time_slots, start_date)
        VALUES ('TEST Batch (testing only)', v_course, v_teacher, '[]', ARRAY[v_child], 'Offline',
                ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], '18:00', '19:00', 'Test',
                (SELECT jsonb_agg(jsonb_build_object('day', d, 'start_time', '18:00', 'end_time', '19:00'))
                   FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) AS d),
                DATE '2026-11-01')
        RETURNING id INTO v_batch;
        RAISE NOTICE 'Created TEST Batch (id %)', v_batch;
    ELSE
        UPDATE batches SET teacher_id = v_teacher,
               student_ids = (SELECT array_agg(DISTINCT x) FROM unnest(student_ids || v_child) AS x)
         WHERE id = v_batch;
    END IF;
END $$;

SELECT u.name, u.role, u.contact_number AS login_phone, u.user_id
  FROM users u
 WHERE u.contact_number IN ('9999900001', '9999900002') AND u.is_deleted = false
 ORDER BY u.role DESC;
