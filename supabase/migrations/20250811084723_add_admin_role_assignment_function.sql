-- Add function for admins to assign roles to users
-- This function bypasses RLS and allows admins to manage user roles

create or replace function public.assign_user_role(
  target_user_id uuid,
  role_to_assign public.app_role
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  current_user_roles text[];
begin
  -- Check if current user is admin
  select array_agg(ur.role::text) into current_user_roles
  from public.user_roles ur
  where ur.user_id = auth.uid();
  
  if not ('admin' = any(current_user_roles)) then
    raise exception 'Only admins can assign roles';
  end if;
  
  -- Insert or update the role
  insert into public.user_roles (user_id, role)
  values (target_user_id, role_to_assign)
  on conflict (user_id, role) do nothing;
  
  return true;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.assign_user_role(uuid, public.app_role) to authenticated;
