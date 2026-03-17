create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  full_name text not null,
  avatar_color text default '#10b981',
  is_active boolean not null default true,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  owner_user_id uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists household_memberships (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer', 'limited')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (household_id, user_id)
);

create table if not exists household_invites (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer', 'limited')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  token text unique,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly numeric(12,2) not null default 0,
  max_members int,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists household_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id) on delete restrict,
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'canceled', 'inactive')),
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists expense_split_rules (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  user_id uuid references profiles(id) on delete set null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  created_at timestamptz default now()
);

create table if not exists expense_occurrence_allocations (
  id uuid primary key default uuid_generate_v4(),
  expense_occurrence_id uuid not null references expense_occurrences(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  user_id uuid references profiles(id) on delete set null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  amount numeric(12,2) not null check (amount >= 0),
  settlement_account_id uuid references bank_accounts(id) on delete set null,
  is_settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_households_owner on households(owner_user_id);
create index if not exists idx_household_memberships_household on household_memberships(household_id);
create index if not exists idx_household_memberships_user on household_memberships(user_id);
create index if not exists idx_household_invites_household on household_invites(household_id);
create index if not exists idx_household_invites_email on household_invites(email);
create index if not exists idx_household_subscriptions_household on household_subscriptions(household_id);
create index if not exists idx_expense_split_rules_expense on expense_split_rules(expense_id);
create index if not exists idx_expense_occurrence_allocations_occurrence on expense_occurrence_allocations(expense_occurrence_id);

insert into subscription_plans (code, name, description, price_monthly, max_members, is_active)
values
  ('free', 'Gratis', 'Plan base para organizar un hogar pequeno', 0, 3, true),
  ('plus', 'Plus', 'Mas integrantes, reportes avanzados y mejor control compartido', 149, 8, true),
  ('family', 'Family', 'Plan familiar amplio con funciones premium y administracion extendida', 249, null, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  max_members = excluded.max_members,
  is_active = excluded.is_active;
