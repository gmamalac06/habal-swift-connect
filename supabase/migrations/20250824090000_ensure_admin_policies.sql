-- Ensure admin-friendly RLS policies and helper functions
-- Idempotent: safe to run multiple times

-- 1) Ensure has_role function exists and uses correct search_path
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 2) Ensure admin assign function exists and is security definer
create or replace function public.assign_user_role(
  target_user_id uuid,
  role_to_assign public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow callers who are already admins
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can assign roles';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, role_to_assign)
  on conflict (user_id, role) do nothing;

  return true;
end;
$$;

grant execute on function public.assign_user_role(uuid, public.app_role) to authenticated;

-- 3) User roles table policies
alter table public.user_roles enable row level security;

-- allow users to read their own roles
drop policy if exists "User roles: owner can read own" on public.user_roles;
create policy "User roles: owner can read own" on public.user_roles
  for select
  using (auth.uid() = user_id);

-- allow admins to read all user_roles
drop policy if exists "User roles: admins can read all" on public.user_roles;
create policy "User roles: admins can read all" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- only admins can insert/update/delete user_roles
drop policy if exists "User roles: admins can insert" on public.user_roles;
create policy "User roles: admins can insert" on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "User roles: admins can update" on public.user_roles;
create policy "User roles: admins can update" on public.user_roles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "User roles: admins can delete" on public.user_roles;
create policy "User roles: admins can delete" on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Profiles table policies: owner or admin can read; owner can insert/update; admins can update
alter table public.profiles enable row level security;

-- Ensure any conflicting profile read policies are removed before creating ours
drop policy if exists "Profiles: owner can read" on public.profiles;
drop policy if exists "Profiles: owner or admin can read" on public.profiles;

-- Create the "Profiles: owner or admin can read" policy only if it doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles: owner or admin can read'
  ) THEN
    EXECUTE 'CREATE POLICY "Profiles: owner or admin can read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), ''admin''))';
  ELSE
    RAISE NOTICE 'Policy "Profiles: owner or admin can read" already exists, skipping creation.';
  END IF;
END
$$;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles: owner can update own" on public.profiles;
create policy "Profiles: owner can update own" on public.profiles
  for update
  using (auth.uid() = id);

-- allow admins to update any profile
drop policy if exists "Profiles: admins can update all" on public.profiles;
create policy "Profiles: admins can update all" on public.profiles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5) Drivers table: ensure admins can manage all drivers
alter table public.drivers enable row level security;

drop policy if exists "Drivers: admins can manage all" on public.drivers;
create policy "Drivers: admins can manage all" on public.drivers
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 6) Re-enable RLS if it was accidentally disabled elsewhere
-- (safe no-op if already enabled)
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;

-- 7) Helpful check: report current policies (optional - leaves no state change)
-- You can run the following SELECTs in the SQL editor to confirm policies after running this migration:
-- select policyname, permissive, roles, qual, with_check from pg_policies where tablename = 'user_roles';
-- select policyname, permissive, roles, qual, with_check from pg_policies where tablename = 'profiles';

-- End of migration
