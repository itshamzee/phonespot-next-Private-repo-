-- Praktikant-rolle: må kun bruge hurtig tilbehørsoptagelsen (håndhæves i
-- src/lib/auth/intern-access.ts via requireStaff, middleware og admin-layoutet).
alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role = any (array['employee'::text, 'manager'::text, 'owner'::text, 'intern'::text]));
