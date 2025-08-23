-- Verification script for user_roles setup
-- Run this in Supabase SQL editor to verify everything is working

-- 1. Check if user_roles table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_roles';

-- 2. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_roles';

-- 3. List all policies on user_roles table
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
ORDER BY policyname;

-- 4. Check if the has_role function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'has_role';

-- 5. Test the has_role function (replace with actual user_id)
-- SELECT public.has_role('your-user-id-here', 'driver');

-- 6. Check current user_roles entries (if any)
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
ORDER BY ur.role, p.full_name;
