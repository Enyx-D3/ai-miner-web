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

create or replace function public.brain2_claim_billing_event(p_event_id text, p_event_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing record;
begin
  insert into public.brain2_billing_events (stripe_event_id, event_type, processing_started_at)
  values (p_event_id, p_event_type, now())
  on conflict do nothing;

  if found then
    return 'claimed';
  end if;

  select processed_at, failed_at, processing_started_at
    into existing
    from public.brain2_billing_events
    where stripe_event_id = p_event_id
    for update;

  if existing.processed_at is not null then
    return 'processed';
  end if;

  if existing.failed_at is not null or existing.processing_started_at < now() - interval '10 minutes' then
    update public.brain2_billing_events
       set event_type = p_event_type,
           processing_started_at = now(),
           failed_at = null,
           error = null
     where stripe_event_id = p_event_id;
    return 'claimed';
  end if;

  return 'processing';
end;
$$;

revoke all on function public.brain2_claim_billing_event(text, text) from public;
grant execute on function public.brain2_claim_billing_event(text, text) to service_role;

create table if not exists public.brain2_billing_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.brain2_billing_rate_limits enable row level security;

create or replace function public.brain2_billing_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_reset timestamptz := now() + make_interval(secs => p_window_seconds);
  current_count integer;
begin
  insert into public.brain2_billing_rate_limits (key, count, reset_at, updated_at)
  values (p_key, 1, next_reset, now())
  on conflict (key) do update
    set count = case
          when public.brain2_billing_rate_limits.reset_at <= now() then 1
          else public.brain2_billing_rate_limits.count + 1
        end,
        reset_at = case
          when public.brain2_billing_rate_limits.reset_at <= now() then next_reset
          else public.brain2_billing_rate_limits.reset_at
        end,
        updated_at = now()
  returning count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.brain2_billing_rate_limit(text, integer, integer) from public;
grant execute on function public.brain2_billing_rate_limit(text, integer, integer) to service_role;

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

create table if not exists public.brain2_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  price_id text not null,
  status text not null check (status in ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brain2_subscriptions enable row level security;

drop policy if exists "brain2 subscriptions select own" on public.brain2_subscriptions;
create policy "brain2 subscriptions select own"
  on public.brain2_subscriptions
  for select
  using (auth.uid() = user_id);
