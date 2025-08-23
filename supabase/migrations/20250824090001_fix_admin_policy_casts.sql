-- Fix enum casts in admin-friendly RLS policies
-- Idempotent: safe to run multiple times

-- 1) Drop existing policies that need enum casts fixed
drop policy if exists "Profiles: owner or admin can read" on public.profiles;
drop policy if exists "Profiles: admins can update all" on public.profiles;
drop policy if exists "Drivers: admins can manage all" on public.drivers;

-- 2) Recreate policies with proper enum casts
-- Profiles read policy
create policy "Profiles: owner or admin can read" on public.profiles
  for select to authenticated
  using (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Profiles admin update policy
create policy "Profiles: admins can update all" on public.profiles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drivers admin policy
create policy "Drivers: admins can manage all" on public.drivers
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Insert admin role for known admin user if missing
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- 4) Verify policies and roles
-- Run these checks to confirm:
-- SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'user_roles', 'drivers');
-- SELECT * FROM user_roles WHERE role = 'admin'::public.app_role;
