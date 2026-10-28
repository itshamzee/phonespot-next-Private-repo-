-- Praktikant-rolle: må kun bruge hurtig tilbehørsoptagelsen (håndhæves i
-- src/lib/auth/intern-access.ts via requireStaff, middleware og admin-layoutet).
alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role = any (array['employee'::text, 'manager'::text, 'owner'::text, 'intern'::text]));

-- RLS-hjælperne må ikke give praktikanter personaleadgang til tabeller via
-- PostgREST; hurtig-optagelsen går kun gennem server-ruter med service-role.
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_id = auth.uid() and is_active = true and role <> 'intern');
$$;
create or replace function public.get_staff_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from staff where auth_id = auth.uid() and is_active = true and role <> 'intern';
$$;
create or replace function public.get_staff_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from staff where auth_id = auth.uid() and is_active = true and role <> 'intern';
$$;
create or replace function public.get_staff_location() returns uuid
  language sql stable security definer set search_path = public as $$
  select location_id from staff where auth_id = auth.uid() and is_active = true and role <> 'intern';
$$;
