-- Adjust policies to handle riders (users without explicit roles)
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Profiles: owner read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin read" ON public.profiles;
DROP POLICY IF EXISTS "User roles: owner read" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin read" ON public.user_roles;
DROP POLICY IF EXISTS "Drivers: admin read" ON public.drivers;

-- First ensure the admin role exists and is properly assigned
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- Create policies for profiles table
-- Admins can see and modify all profiles
CREATE POLICY "Profiles: admin access"
ON public.profiles FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

-- Users can read their own profile
CREATE POLICY "Profiles: self access"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policies for user_roles table
-- Admins have full access to user_roles
CREATE POLICY "User roles: admin access"
ON public.user_roles FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

-- Users can see their own role if they have one
CREATE POLICY "User roles: self access"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for drivers table
-- Admins have full access to drivers table
CREATE POLICY "Drivers: admin access"
ON public.drivers FOR ALL
TO authenticated
USING ((SELECT role = 'admin'::public.app_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

-- Driver can access their own record
CREATE POLICY "Drivers: self access"
ON public.drivers FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.drivers TO authenticated;
