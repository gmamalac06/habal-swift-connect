-- Add missing INSERT policy for user_roles table
-- This allows users to create their own roles during signup

DO $$ 
BEGIN
  -- Drop existing INSERT policy if it exists
  DROP POLICY IF EXISTS "User roles: user can insert own role" ON public.user_roles;
  
  -- Create INSERT policy for user_roles
  CREATE POLICY "User roles: user can insert own role" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
  
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

-- Also ensure the existing policies are correct:
DO $$ 
BEGIN
  -- Recreate the admin management policy to include INSERT
  DROP POLICY IF EXISTS "User roles: admins can manage" ON public.user_roles;
  
  CREATE POLICY "User roles: admins can manage" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
  
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

-- Verify the policy was created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_roles' 
AND policyname = 'User roles: user can insert own role';
