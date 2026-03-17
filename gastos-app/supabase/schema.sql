-- =============================================
-- GASTOS MENSUALES - Supabase Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- MEMBERS (Miembros del hogar)
-- =============================================
create table members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  avatar_color text default '#10b981',
  created_at timestamptz default now()
);

-- =============================================
-- INCOME (Ingresos proyectados por mes)
-- =============================================
create table income (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id) on delete cascade,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  bank_movement_id uuid references bank_movements(id) on delete set null,
  amount numeric(12,2) not null,
  description text,
  month int not null check (month between 1 and 12),
  year int not null,
  created_at timestamptz default now()
);

create table if not exists bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  bank text not null,
  type text not null check (type in ('debito', 'credito', 'ahorro', 'inversion', 'efectivo')),
  balance numeric(12,2) not null default 0,
  color text default '#10b981',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists bank_movements (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references bank_accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('ingreso', 'egreso')),
  date date not null,
  notes text,
  transfer_group_id uuid,
  created_at timestamptz default now()
);

-- =============================================
-- CATEGORIES (Rubros)
-- =============================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text,
  color text,
  created_at timestamptz default now()
);

-- Insert default categories
insert into categories (name, icon, color) values
  ('Crédito', '💳', '#ef4444'),
  ('Suscripciones', '📱', '#8b5cf6'),
  ('Supermercado', '🛒', '#f59e0b'),
  ('Telefonía', '📞', '#3b82f6'),
  ('Internet', '🌐', '#06b6d4'),
  ('Mascotas', '🐾', '#ec4899'),
  ('Transporte', '🚗', '#f97316'),
  ('Educación', '📚', '#84cc16'),
  ('Salud', '🏥', '#14b8a6'),
  ('Entretenimiento', '🎬', '#a855f7'),
  ('Servicios', '🏠', '#64748b'),
  ('Restaurantes', '🍽️', '#e11d48'),
  ('Ropa', '👗', '#d946ef'),
  ('Viajes', '✈️', '#0ea5e9'),
  ('Otros', '📦', '#94a3b8');

-- =============================================
-- PAYMENT METHODS (Tarjetas, efectivo, transferencias)
-- =============================================
create table payment_methods (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('tarjeta_credito', 'tarjeta_debito', 'tarjeta_vales', 'efectivo', 'transferencia')),
  bank text,
  last_four text,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  billing_cutoff_day int check (billing_cutoff_day between 1 and 31),
  payment_due_day int check (payment_due_day between 1 and 31),
  color text default '#10b981',
  created_at timestamptz default now()
);

-- =============================================
-- EXPENSES (Gastos fijos y variables)
-- =============================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id) on delete set null,
  category_id uuid references categories(id),
  description text not null,
  amount numeric(12,2) not null,
  recurrence_type text not null default 'mensual' check (recurrence_type in ('mensual', 'semanal')),
  weekly_day int check (weekly_day between 0 and 6),
  months_duration int default 1,  -- cuántos meses se pagará (0 = indefinido)
  start_month int not null check (start_month between 1 and 12),
  start_year int not null,
  is_fixed boolean default true,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table expense_occurrences (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references expenses(id) on delete cascade,
  occurrence_date date not null,
  amount numeric(12,2) not null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  bank_movement_id uuid references bank_movements(id) on delete set null,
  is_paid boolean not null default false,
  paid_at date,
  paid_payment_method_id uuid references payment_methods(id) on delete set null,
  created_at timestamptz default now(),
  unique (expense_id, occurrence_date)
);

-- =============================================
-- VIEWS útiles
-- =============================================

-- Vista de gastos con categoría y miembro
create or replace view expenses_detail as
select 
  e.*,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  m.name as member_name,
  m.avatar_color as member_color
from expenses e
left join categories c on e.category_id = c.id
left join members m on e.member_id = m.id;

create or replace view expense_occurrences_detail as
select
  eo.id,
  eo.expense_id,
  eo.occurrence_date,
  eo.amount,
  eo.payment_method_id,
  eo.bank_movement_id,
  eo.is_paid,
  eo.paid_at,
  eo.paid_payment_method_id,
  eo.created_at,
  e.description,
  e.notes,
  e.recurrence_type,
  e.weekly_day,
  e.is_fixed,
  e.months_duration,
  e.start_month,
  e.start_year,
  e.category_id,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  e.member_id,
  m.name as member_name,
  m.avatar_color as member_color,
  pm.name as payment_method_name,
  pm.type as payment_method_type,
  pm.last_four as payment_method_last_four,
  pm.bank as payment_method_bank,
  pm.color as payment_method_color,
  ppm.name as paid_payment_method_name,
  ppm.type as paid_payment_method_type,
  ppm.last_four as paid_payment_method_last_four
from expense_occurrences eo
join expenses e on e.id = eo.expense_id
left join categories c on c.id = e.category_id
left join members m on m.id = e.member_id
left join payment_methods pm on pm.id = eo.payment_method_id
left join payment_methods ppm on ppm.id = eo.paid_payment_method_id;

-- Vista de ingresos con miembro
create or replace view income_detail as
select 
  i.*,
  m.name as member_name,
  m.avatar_color as member_color,
  ba.name as bank_account_name,
  ba.type as bank_account_type
from income i
left join members m on i.member_id = m.id
left join bank_accounts ba on i.bank_account_id = ba.id;

-- =============================================
-- RLS (Row Level Security) - Opcional
-- =============================================
-- Habilitar si requieres auth de usuario
-- alter table members enable row level security;
-- alter table income enable row level security;
-- alter table expenses enable row level security;
-- alter table categories enable row level security;

-- =============================================
-- ÍNDICES para performance
-- =============================================
create index idx_income_year_month on income(year, month);
create index idx_expenses_start on expenses(start_year, start_month);
create index idx_expenses_category on expenses(category_id);
create index idx_expenses_member on expenses(member_id);
create index idx_expense_occurrences_date on expense_occurrences(occurrence_date);
create index idx_expense_occurrences_expense on expense_occurrences(expense_id);
create index idx_expense_occurrences_paid on expense_occurrences(is_paid, occurrence_date);
create index idx_payment_methods_type on payment_methods(type);
