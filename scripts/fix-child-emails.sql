-- Replace the imported "parent+childN@gmail.com" addresses with the placeholder
-- the app itself generates for a child who has no email of their own.
--
-- Background: scripts/import-csv.cjs (run 2026-02-11) needed a unique email per
-- student, so it derived one from the parent's address with Gmail's plus trick.
-- Mail did reach the parent, but the address is confusing, it only works on
-- providers that support plus-addressing, and it left the database with two
-- conventions: imported children on "+childN", children registered through the
-- app on "<user-id>@child.nadanaloga.local" (server.js, createUser).
--
-- After this runs, those students have no real email, so resolveFeeContact
-- sends their fee and attendance notices to the parent — which is where they
-- were already going, since the parent is the first candidate.
--
-- Nothing else changes: logins are by phone, user ID or the parent's own email;
-- every affected row keeps its user_id, parent_id and contact_number.
--
-- Run it with:
--   psql -U nadanaloga_user -d nadanaloga -f fix-child-emails.sql
-- Take a backup first.

\echo '--- before ---'
SELECT count(*) FILTER (WHERE email LIKE '%+child%')                 AS plus_child,
       count(*) FILTER (WHERE email LIKE '%@child.nadanaloga.local') AS placeholder
  FROM users;

BEGIN;

-- Guard: only students, only the imported pattern, only rows with a user id to
-- build the new address from. A missing user_id would collide on the unique
-- email constraint, so those are left alone and reported below.
UPDATE users
   SET email = lower(user_id) || '@child.nadanaloga.local',
       updated_at = now()
 WHERE role = 'Student'
   AND email LIKE '%+child%'
   AND user_id IS NOT NULL
   AND user_id <> '';

COMMIT;

\echo '--- after ---'
SELECT count(*) FILTER (WHERE email LIKE '%+child%')                 AS plus_child_left,
       count(*) FILTER (WHERE email LIKE '%@child.nadanaloga.local') AS placeholder
  FROM users;

\echo '--- any left behind (no user_id), to handle by hand ---'
SELECT id, name, email FROM users WHERE email LIKE '%+child%';
