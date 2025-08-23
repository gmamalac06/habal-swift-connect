-- Add 'banned' role to app_role enum for user banning functionality
-- This approach safely adds the new role without breaking existing dependencies

-- Add the 'banned' value to the existing enum type
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'banned';

-- Update the has_role function to work with the updated enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Update the assign_user_role function to work with the updated enum
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  role_to_assign public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_roles text[];
BEGIN
  -- Check if current user is admin
  SELECT array_agg(ur.role::text) INTO current_user_roles
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();
  
  IF NOT ('admin' = ANY(current_user_roles)) THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Insert or update the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$;
