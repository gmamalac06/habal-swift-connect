-- Temporary migration to ensure admin can access all data
-- This will help us test if RLS is the issue

-- Temporarily disable RLS on user_roles table for testing
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on profiles table for testing  
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on drivers table for testing
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;

-- Create a simple function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
