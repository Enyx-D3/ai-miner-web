create table if not exists public.brain2_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brain2_user_profiles enable row level security;

drop policy if exists "brain2 profiles select own" on public.brain2_user_profiles;
create policy "brain2 profiles select own"
  on public.brain2_user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "brain2 profiles insert own" on public.brain2_user_profiles;
create policy "brain2 profiles insert own"
  on public.brain2_user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "brain2 profiles update own" on public.brain2_user_profiles;
create policy "brain2 profiles update own"
  on public.brain2_user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.brain2_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'NONE' check (status in ('NONE', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED')),
  plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brain2_entitlements enable row level security;

drop policy if exists "brain2 entitlements select own" on public.brain2_entitlements;
create policy "brain2 entitlements select own"
  on public.brain2_entitlements
  for select
  using (auth.uid() = user_id);
