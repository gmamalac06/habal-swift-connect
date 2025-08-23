-- Force-fix user_roles policies to remove recursive policies and restore admin read/write paths
-- Idempotent: safe to run multiple times

-- Make sure RLS is enabled (we will recreate policies safely)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any older policies that might reference has_role and cause recursion
DROP POLICY IF EXISTS "User roles: owner can read own" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admins can read all" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admins can insert" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admins can update" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admins can delete" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: owner read" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin read" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin update" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin delete" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: select for authenticated" ON public.user_roles;

-- Create a permissive SELECT policy so has_role can query this table safely from functions
-- Create SELECT policy only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'User roles: select for authenticated'
  ) THEN
    EXECUTE 'CREATE POLICY "User roles: select for authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true)';
  END IF;
END
$$;

-- Admin-only insert/update/delete policies (use has_role in WITH CHECK/USING for writes only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'User roles: admin insert'
  ) THEN
    EXECUTE 'CREATE POLICY "User roles: admin insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'User roles: admin update'
  ) THEN
    EXECUTE 'CREATE POLICY "User roles: admin update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'User roles: admin delete'
  ) THEN
    EXECUTE 'CREATE POLICY "User roles: admin delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))';
  END IF;
END
$$;

-- Done
