alter table profiles
  alter column id drop default;

alter table households
  add column if not exists created_by uuid references profiles(id) on delete set null;

alter table bank_accounts
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table bank_movements
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table payment_methods
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table income
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table expenses
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table expense_occurrences
  add column if not exists household_id uuid references households(id) on delete cascade;

alter table budget_limits
  add column if not exists household_id uuid references households(id) on delete cascade;
