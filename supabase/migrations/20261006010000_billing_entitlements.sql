alter table public.brain2_entitlements
  add column if not exists source text,
  add column if not exists lifetime boolean not null default false,
  add column if not exists revoked_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists stripe_payment_intent_id text;

create table if not exists public.brain2_stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brain2_stripe_customers enable row level security;

drop policy if exists "brain2 stripe customers select own" on public.brain2_stripe_customers;
create policy "brain2 stripe customers select own"
  on public.brain2_stripe_customers
  for select
  using (auth.uid() = user_id);

create table if not exists public.brain2_billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  processing_started_at timestamptz,
  processed_at timestamptz not null default now()
);

alter table public.brain2_billing_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists error text,
  alter column processed_at drop not null,
  alter column processed_at drop default;

alter table public.brain2_billing_events enable row level security;

create table if not exists public.brain2_billing_audit (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  stripe_object_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.brain2_billing_audit enable row level security;

create table if not exists public.brain2_lifetime_licenses (
  stripe_payment_intent_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_checkout_session_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brain2_lifetime_licenses enable row level security;

drop policy if exists "brain2 lifetime licenses select own" on public.brain2_lifetime_licenses;
create policy "brain2 lifetime licenses select own"
  on public.brain2_lifetime_licenses
  for select
  using (auth.uid() = user_id);
