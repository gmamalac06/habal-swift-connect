-- Fix RLS policies for admin to read all user roles
-- The current policy might not be working correctly for SELECT operations

-- Drop existing admin policy
DROP POLICY IF EXISTS "User roles: admins can manage" ON public.user_roles;

-- Create separate policies for different operations
-- Policy for admins to read all user roles
CREATE POLICY "User roles: admins can read all" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to insert user roles
CREATE POLICY "User roles: admins can insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to update user roles
CREATE POLICY "User roles: admins can update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to delete user roles
CREATE POLICY "User roles: admins can delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also ensure profiles table has proper admin access
-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Profiles: admins can read all" ON public.profiles;

-- Create policy for admins to read all profiles
CREATE POLICY "Profiles: admins can read all" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
