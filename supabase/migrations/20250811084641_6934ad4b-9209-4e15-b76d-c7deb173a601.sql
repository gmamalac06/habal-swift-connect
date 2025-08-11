-- App roles enum and role management
create type public.app_role as enum ('admin', 'driver', 'rider');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Profiles table for users (basic info)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.update_updated_at_column();

create policy "Profiles are viewable by owner" on public.profiles
for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
for update using (auth.uid() = id);

-- Drivers table (extended info for drivers)
create type public.driver_approval_status as enum ('pending', 'approved', 'rejected');

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_make text,
  vehicle_model text,
  plate_number text,
  license_number text,
  is_available boolean not null default false,
  approval_status public.driver_approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.drivers enable row level security;

create trigger trg_drivers_updated
before update on public.drivers
for each row execute function public.update_updated_at_column();

-- Driver RLS: owner can select/update own row; admins can manage all; authenticated can select approved drivers
create policy "Drivers: owner can manage own" on public.drivers
for select using (auth.uid() = user_id);

create policy "Drivers: owner can update own" on public.drivers
for update using (auth.uid() = user_id);

create policy "Drivers: owner can insert" on public.drivers
for insert with check (auth.uid() = user_id);

create policy "Drivers: admins can manage all" on public.drivers
for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Drivers: approved visible to all authenticated" on public.drivers
for select to authenticated
using (approval_status = 'approved');

-- Rides
create type public.ride_status as enum ('requested','assigned','accepted','in_progress','completed','cancelled');

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid references auth.users(id) on delete set null,
  status public.ride_status not null default 'requested',
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  scheduled_at timestamptz,
  estimated_distance_km numeric(6,2),
  estimated_fare numeric(10,2),
  final_fare numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rides enable row level security;

create index idx_rides_rider on public.rides(rider_id);
create index idx_rides_driver on public.rides(driver_id);
create index idx_rides_status on public.rides(status);

create trigger trg_rides_updated
before update on public.rides
for each row execute function public.update_updated_at_column();

-- Rides RLS
create policy "Rides: rider can view own" on public.rides
for select using (auth.uid() = rider_id);

create policy "Rides: rider can insert own" on public.rides
for insert with check (auth.uid() = rider_id);

create policy "Rides: rider can update own for cancel" on public.rides
for update using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

create policy "Rides: assigned driver can view" on public.rides
for select using (auth.uid() = driver_id);

create policy "Rides: assigned driver can update status" on public.rides
for update using (auth.uid() = driver_id);

create policy "Rides: admins can manage all" on public.rides
for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Payments
create type public.payment_method as enum ('gcash','paymaya','cod');
create type public.payment_status as enum ('pending','paid','failed','refunded');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  payer_id uuid not null references auth.users(id) on delete cascade,
  method public.payment_method not null,
  amount numeric(10,2) not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create trigger trg_payments_updated
before update on public.payments
for each row execute function public.update_updated_at_column();

create index idx_payments_ride on public.payments(ride_id);

create policy "Payments: rider can view own ride payments" on public.payments
for select using (auth.uid() = payer_id);

create policy "Payments: rider can insert own payment" on public.payments
for insert with check (auth.uid() = payer_id);

create policy "Payments: admins can manage all" on public.payments
for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Ratings
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rider_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

create unique index uniq_ratings_per_ride on public.ratings(ride_id);

create policy "Ratings: rider can insert for own ride" on public.ratings
for insert with check (auth.uid() = rider_id);

create policy "Ratings: rider can view own ratings" on public.ratings
for select using (auth.uid() = rider_id);

create policy "Ratings: drivers can view ratings about them" on public.ratings
for select using (auth.uid() = driver_id);

create policy "Ratings: admins can view all" on public.ratings
for select using (public.has_role(auth.uid(), 'admin'));

-- Pricing settings (single row)
create table public.pricing_settings (
  id int primary key default 1,
  base_fare numeric(10,2) not null default 25.00,
  per_km numeric(10,2) not null default 10.00,
  surge_multiplier numeric(4,2) not null default 1.00,
  updated_at timestamptz not null default now()
);

alter table public.pricing_settings enable row level security;

create policy "Pricing: readable by all authenticated" on public.pricing_settings
for select to authenticated using (true);

create policy "Pricing: admins can update" on public.pricing_settings
for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Operational areas (simple)
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  polygon_geojson jsonb, -- optional
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.areas enable row level security;

create policy "Areas: readable by all authenticated" on public.areas
for select to authenticated using (true);

create policy "Areas: admins manage" on public.areas
for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Realtime configuration for rides
alter table public.rides replica identity full;

-- Add tables to realtime publication
alter publication supabase_realtime add table public.rides;

-- Seed an admin role mapping for the first user (no-op here, manual in dashboard usually).
-- Note: Admins should be assigned via dashboard or a controlled process.
