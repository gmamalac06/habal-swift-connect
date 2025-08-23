-- Add admin bypass policies and debug logging
-- Enable RLS debug logging to see policy evaluation in logs
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_min_duration_statement = 0;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Admin bypass: full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin bypass: full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin bypass: full access to drivers" ON public.drivers;

-- Create bypass policies for admins (using direct role check)
CREATE POLICY "Admin bypass: full access to profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin bypass: full access to user_roles" ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin bypass: full access to drivers" ON public.drivers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::public.app_role
    )
  );

-- Verify admin role exists and add if missing
INSERT INTO public.user_roles (user_id, role)
VALUES ('dee52a2c-684c-41b2-8064-5b2d159c8bca', 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

-- Diagnostic queries to run after applying:
-- 1. Check active policies:
-- SELECT tablename, policyname, permissive, roles, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('profiles', 'user_roles', 'drivers')
-- ORDER BY tablename, policyname;

-- 2. Verify admin role:
-- SELECT ur.*, p.full_name, p.phone 
-- FROM user_roles ur 
-- LEFT JOIN profiles p ON p.id = ur.user_id 
-- WHERE ur.role = 'admin'::public.app_role;

-- 3. Test admin access directly:
-- SET auth.uid = 'dee52a2c-684c-41b2-8064-5b2d159c8bca';
-- SELECT EXISTS (SELECT 1 FROM profiles LIMIT 1) as can_read_profiles;
-- SELECT EXISTS (SELECT 1 FROM user_roles LIMIT 1) as can_read_roles;
-- RESET auth.uid;
