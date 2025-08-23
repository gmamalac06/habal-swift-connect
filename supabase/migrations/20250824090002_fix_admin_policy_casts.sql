-- Add admin RLS bypass and ensure admin user has access
-- Idempotent: safe to run multiple times

-- First ensure the admin role exists and is properly assigned
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Profiles: owner read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin read" ON public.profiles;
DROP POLICY IF EXISTS "User roles: owner read" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin read" ON public.user_roles;
DROP POLICY IF EXISTS "Drivers: admin read" ON public.drivers;

-- Create separate read policies for owners and admins
CREATE POLICY "Profiles: owner read"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Profiles: admin read"
ON public.profiles FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "User roles: owner read"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "User roles: admin read"
ON public.user_roles FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Drivers: admin read"
ON public.drivers FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Verify the policies and admin access:
-- SELECT tablename, policyname, cmd AS operation, roles, qual AS using_check
-- FROM pg_policies WHERE tablename IN ('profiles', 'user_roles', 'drivers');
