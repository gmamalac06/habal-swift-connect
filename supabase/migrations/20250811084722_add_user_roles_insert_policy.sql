-- Add missing INSERT policy for user_roles table
-- This allows users to create their own roles during signup

-- Add INSERT policy for user_roles (idempotent)
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
