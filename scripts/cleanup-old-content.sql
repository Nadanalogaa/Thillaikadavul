-- Remove events, notices, grade exams and book materials left over from before
-- the register import (test posts such as "jajajjaja" that families can see).
-- Only rows created BEFORE the import are touched: the cut-off is when the
-- first imported parent login was created, so anything posted since stays.
-- Prints every title it removes. Run on the server:
--   docker exec -i nadanaloga-db psql -U <db user> -d <db name> < cleanup-old-content.sql
BEGIN;
CREATE TEMP TABLE cutoff AS
  SELECT MIN(created_at) AS t FROM users WHERE role = 'Parent' AND is_deleted = false;
SELECT t AS "removing posts created before" FROM cutoff;

DELETE FROM events        WHERE created_at < (SELECT t FROM cutoff) RETURNING 'event' AS kind, title;
DELETE FROM notices       WHERE created_at < (SELECT t FROM cutoff) RETURNING 'notice' AS kind, title;
DELETE FROM grade_exams   WHERE created_at < (SELECT t FROM cutoff) RETURNING 'grade exam' AS kind, exam_name AS title;
DELETE FROM book_materials WHERE created_at < (SELECT t FROM cutoff) RETURNING 'material' AS kind, title;
COMMIT;
