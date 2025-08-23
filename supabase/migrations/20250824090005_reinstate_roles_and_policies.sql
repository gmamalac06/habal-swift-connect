-- Reinstate roles, helper functions, and robust RLS policies
-- Idempotent: safe to run multiple times

-- 1) Ensure 'banned' value exists on app_role enum
-- Add 'banned' enum value only if it's not already present (works on older Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'banned'
  ) THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE ''banned''';
  END IF;
END
$$;

-- 2) has_role helper (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 3) assign_user_role (security definer, enforces admin-only callers)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  role_to_assign public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow callers who are admins
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Ensure authenticated role can call the function (used by client via RPC)
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 4) Reapply RLS policies in a robust, idempotent way

-- user_roles table policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated sessions to SELECT user_roles (avoids recursion when has_role is called inside policies)
DROP POLICY IF EXISTS "User roles: select for authenticated" ON public.user_roles;
CREATE POLICY "User roles: select for authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "User roles: admin insert" ON public.user_roles;
CREATE POLICY "User roles: admin insert"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "User roles: admin update" ON public.user_roles;
CREATE POLICY "User roles: admin update"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "User roles: admin delete" ON public.user_roles;
CREATE POLICY "User roles: admin delete"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: owner or admin read" ON public.profiles;
CREATE POLICY "Profiles: owner or admin read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
CREATE POLICY "Profiles: insert own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: owner update" ON public.profiles;
CREATE POLICY "Profiles: owner update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: admin update" ON public.profiles;
CREATE POLICY "Profiles: admin update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- drivers table policies
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers: owner read" ON public.drivers;
CREATE POLICY "Drivers: owner read"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Drivers: admin all" ON public.drivers;
CREATE POLICY "Drivers: admin all"
  ON public.drivers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) Ensure RLS is enabled on key tables (safe no-op if already enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- End of migration
