create table if not exists expense_occurrences (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references expenses(id) on delete cascade,
  occurrence_date date not null,
  amount numeric(12,2) not null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  is_paid boolean not null default false,
  paid_at date,
  paid_payment_method_id uuid references payment_methods(id) on delete set null,
  created_at timestamptz default now(),
  unique (expense_id, occurrence_date)
);

create index if not exists idx_expense_occurrences_date on expense_occurrences(occurrence_date);
create index if not exists idx_expense_occurrences_expense on expense_occurrences(expense_id);
create index if not exists idx_expense_occurrences_paid on expense_occurrences(is_paid, occurrence_date);

create or replace view expense_occurrences_detail as
select
  eo.id,
  eo.expense_id,
  eo.occurrence_date,
  eo.amount,
  eo.payment_method_id,
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
