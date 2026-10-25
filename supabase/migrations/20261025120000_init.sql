-- Soda.agents phase-1 schema.
-- The Next.js server uses the service role, which bypasses RLS.
-- The anon and authenticated roles cannot read buyer data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  email text,
  country text,
  created_at timestamptz not null default now(),
  constraint profiles_country_chk check (country is null or country ~ '^[A-Z]{2}$')
);

create table if not exists public.agents (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  sector text not null,
  summary text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  endpoint_url text not null,
  is_active boolean not null default true,
  execution boolean not null default false,
  delivery text not null check (delivery in ('hosted', 'kit')),
  tier text not null,
  free_daily_checks integer,
  hint text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key,
  agent_id uuid references public.agents (id),
  kind text not null check (kind in ('pass_30d', 'one_off', 'ppu')),
  price_usdc numeric(12, 2) not null check (price_usdc >= 0),
  credits integer,
  scope text not null default 'agent' check (scope in ('agent', 'sector', 'all')),
  sector text,
  label text not null,
  is_purchasable boolean not null default true,
  constraint listings_scope_chk check (
    (scope = 'agent' and agent_id is not null)
    or (scope = 'sector' and sector is not null)
    or scope = 'all'
  ),
  constraint listings_ppu_not_for_sale check (kind <> 'ppu' or is_purchasable = false)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  listing_id uuid not null references public.listings (id),
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0),
  reference_pubkey text not null unique,
  status text not null check (status in ('pending', 'paid', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id),
  tx_signature text not null unique,
  payer text not null,
  amount numeric(18, 6) not null,
  slot bigint not null,
  verified_at timestamptz not null default now()
);

create table if not exists public.licences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  agent_id uuid not null references public.agents (id),
  order_id uuid not null references public.orders (id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  credits_left integer,
  status text not null check (status in ('active', 'expired', 'revoked')),
  reminder_sent_at timestamptz,
  unique (order_id, agent_id)
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  licence_id uuid not null references public.licences (id),
  key_hash text not null,
  prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_hash_idx on public.api_keys (key_hash);
create unique index if not exists api_keys_one_live_per_licence
  on public.api_keys (licence_id)
  where revoked_at is null;
create index if not exists licences_profile_idx on public.licences (profile_id);
create index if not exists orders_profile_idx on public.orders (profile_id);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys (id),
  agent_id uuid not null references public.agents (id),
  units integer not null default 1 check (units > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.free_checks (
  agent_id uuid not null references public.agents (id),
  bucket text not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (agent_id, bucket, day)
);

create or replace function public.bump_free_check(p_agent_id uuid, p_bucket text, p_day date)
returns integer
language plpgsql
security invoker
as $$
declare
  next_count integer;
begin
  insert into public.free_checks (agent_id, bucket, day, count)
  values (p_agent_id, p_bucket, p_day, 1)
  on conflict (agent_id, bucket, day)
  do update set count = public.free_checks.count + 1
  returning count into next_count;
  return next_count;
end;
$$;

create or replace function public.reserve_free_check(
  p_agent_id uuid,
  p_bucket text,
  p_day date,
  p_max integer
)
returns boolean
language plpgsql
security invoker
as $$
declare
  next_count integer;
begin
  if p_max is null or p_max <= 0 or p_bucket is null or length(p_bucket) > 128 then
    return false;
  end if;
  insert into public.free_checks (agent_id, bucket, day, count)
  values (p_agent_id, p_bucket, p_day, 1)
  on conflict (agent_id, bucket, day)
  do update set count = public.free_checks.count + 1
  where public.free_checks.count < p_max
  returning count into next_count;
  return next_count is not null;
end;
$$;

create or replace function public.release_free_check(p_agent_id uuid, p_bucket text, p_day date)
returns void
language plpgsql
security invoker
as $$
begin
  update public.free_checks
  set count = greatest(count - 1, 0)
  where agent_id = p_agent_id and bucket = p_bucket and day = p_day;
end;
$$;

revoke all on function public.bump_free_check(uuid, text, date) from public;
revoke all on function public.bump_free_check(uuid, text, date) from anon, authenticated;
grant execute on function public.bump_free_check(uuid, text, date) to service_role;
revoke all on function public.reserve_free_check(uuid, text, date, integer) from public;
revoke all on function public.reserve_free_check(uuid, text, date, integer) from anon, authenticated;
grant execute on function public.reserve_free_check(uuid, text, date, integer) to service_role;
revoke all on function public.release_free_check(uuid, text, date) from public;
revoke all on function public.release_free_check(uuid, text, date) from anon, authenticated;
grant execute on function public.release_free_check(uuid, text, date) to service_role;

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.licences enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_events enable row level security;
alter table public.nonces enable row level security;
alter table public.free_checks enable row level security;

drop policy if exists agents_public_read on public.agents;
create policy agents_public_read on public.agents
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select to anon, authenticated
  using (true);

-- Buyer tables have RLS enabled and no policies, so anon and authenticated are denied.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.licences from anon, authenticated;
revoke all on table public.api_keys from anon, authenticated;
revoke all on table public.usage_events from anon, authenticated;
revoke all on table public.nonces from anon, authenticated;
revoke all on table public.free_checks from anon, authenticated;
grant select on table public.agents to anon, authenticated;
grant select on table public.listings to anon, authenticated;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('kits', 'kits', false)
  on conflict (id) do nothing;
exception
  when undefined_table then
    raise notice 'storage schema not available; create the kits bucket in the Supabase dashboard';
end $$;
