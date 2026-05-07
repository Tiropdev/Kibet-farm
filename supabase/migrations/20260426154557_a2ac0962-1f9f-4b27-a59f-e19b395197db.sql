
-- Enums
create type cow_status as enum ('lactating','dry','pregnant','sick','calf');
create type health_kind as enum ('vaccination','deworming','treatment','vet_note');
create type activity_kind as enum ('milk','breeding','health','feeding','calf','cow');

-- Profiles (single-user, but keep table for display name)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Cows
create table public.cows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tag text,
  breed text,
  date_of_birth date,
  number_of_calves int not null default 0,
  status cow_status not null default 'lactating',
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cows enable row level security;
create policy "cows own all" on public.cows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.cows(user_id);

-- Breeding
create table public.breeding_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cow_id uuid not null references public.cows(id) on delete cascade,
  heat_date date,
  insemination_date date,
  expected_due_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.breeding_records enable row level security;
create policy "breeding own" on public.breeding_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.breeding_records(cow_id);

-- Health
create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cow_id uuid not null references public.cows(id) on delete cascade,
  kind health_kind not null,
  description text,
  record_date date not null default current_date,
  next_due_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.health_records enable row level security;
create policy "health own" on public.health_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.health_records(cow_id);

-- Feed
create table public.feed_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cow_id uuid not null references public.cows(id) on delete cascade,
  feed_type text not null,
  quantity_kg numeric(8,2),
  record_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.feed_records enable row level security;
create policy "feed own" on public.feed_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.feed_records(cow_id);

-- Milk
create table public.milk_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cow_id uuid not null references public.cows(id) on delete cascade,
  record_date date not null default current_date,
  am_litres numeric(6,2) not null default 0,
  pm_litres numeric(6,2) not null default 0,
  total_litres numeric(7,2) generated always as (coalesce(am_litres,0) + coalesce(pm_litres,0)) stored,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.milk_records enable row level security;
create policy "milk own" on public.milk_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.milk_records(cow_id, record_date);

-- Calves
create table public.calves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mother_cow_id uuid not null references public.cows(id) on delete cascade,
  name text,
  birth_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.calves enable row level security;
create policy "calves own" on public.calves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.calves(mother_cow_id);

-- Activity log
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cow_id uuid references public.cows(id) on delete set null,
  kind activity_kind not null,
  description text not null,
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;
create policy "activity own" on public.activity_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.activity_log(user_id, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger trg_cows_updated before update on public.cows
for each row execute function public.set_updated_at();

-- Auto-create profile + handle insemination -> due date (283 days)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_breeding_due_date()
returns trigger language plpgsql as $$
begin
  if new.insemination_date is not null and new.expected_due_date is null then
    new.expected_due_date := new.insemination_date + interval '283 days';
  end if;
  return new;
end; $$;
create trigger trg_breeding_due before insert or update on public.breeding_records
for each row execute function public.set_breeding_due_date();

-- Storage bucket for cow photos
insert into storage.buckets (id, name, public) values ('cow-photos','cow-photos', true);

create policy "cow photos public read" on storage.objects
for select using (bucket_id = 'cow-photos');
create policy "cow photos own insert" on storage.objects
for insert with check (bucket_id = 'cow-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "cow photos own update" on storage.objects
for update using (bucket_id = 'cow-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "cow photos own delete" on storage.objects
for delete using (bucket_id = 'cow-photos' and auth.uid()::text = (storage.foldername(name))[1]);
