-- Revert to temporary admin-access state (restore previous working state)
-- Idempotent: safe to run multiple times

-- Ensure admin role row exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- Drop policies that were recently added and may cause recursion or block access
DROP POLICY IF EXISTS "User roles: select for authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin update" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin delete" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: owner read" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin read" ON public.user_roles;

DROP POLICY IF EXISTS "Profiles: owner or admin read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: owner update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin update" ON public.profiles;

DROP POLICY IF EXISTS "Drivers: owner read" ON public.drivers;
DROP POLICY IF EXISTS "Drivers: admin all" ON public.drivers;

-- Disable RLS on profiles and user_roles so the admin UI can access them (temporary)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Keep drivers table RLS enabled (optional)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Grant broad privileges to authenticated while RLS is disabled (temporary)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Note: This migration is a temporary revert to get the admin UI working again.
-- After verification, we should harden policies with the safer RPC/view approach.
