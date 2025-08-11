-- Fix security linter issues
-- 1) Add RLS policies for user_roles
create policy "User roles: user can read own roles" on public.user_roles
for select to authenticated
using (auth.uid() = user_id);

create policy "User roles: admins can manage" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 2) Recreate functions with explicit search_path
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;