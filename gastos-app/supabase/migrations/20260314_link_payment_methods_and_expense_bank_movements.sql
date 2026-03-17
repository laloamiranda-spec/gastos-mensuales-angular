alter table payment_methods
  add column if not exists bank_account_id uuid references bank_accounts(id) on delete set null;

alter table expense_occurrences
  add column if not exists bank_movement_id uuid references bank_movements(id) on delete set null;

drop view if exists expense_occurrences_detail;

create view expense_occurrences_detail as
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

drop view if exists payment_methods_detail;

create view payment_methods_detail as
select
  pm.*,
  ba.name as bank_account_name
from payment_methods pm
left join bank_accounts ba on ba.id = pm.bank_account_id;
