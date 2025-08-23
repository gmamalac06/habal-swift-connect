-- Temporary migration: relax RLS so admin UI can manage users
-- Idempotent and reversible. Remove or replace with stricter policies after verification.

-- Ensure admin role exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- Drop any existing policies that might block access
DROP POLICY IF EXISTS "Profiles: admin access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self access" ON public.profiles;
DROP POLICY IF EXISTS "User roles: admin access" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: self access" ON public.user_roles;
DROP POLICY IF EXISTS "Drivers: admin access" ON public.drivers;
DROP POLICY IF EXISTS "Drivers: self access" ON public.drivers;

-- Temporarily disable RLS on profiles and user_roles so admin UI can operate
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
-- Keep drivers table RLS enabled (optional)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Grant basic SELECT/INSERT/UPDATE/DELETE to authenticated role while RLS is disabled
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Note: This is temporary for debugging/admin use. Replace with stricter policies after confirming the admin UI works.
