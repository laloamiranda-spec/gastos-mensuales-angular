-- Campos para compras a meses / diferidos con tarjeta de crédito.
-- purchase_date: fecha de la transacción (para calcular el primer pago según corte/límite).
-- total_amount:  total solicitado / monto original de la compra.
-- interest_amount: interés total del diferido (lo que da el estado de cuenta).
-- is_deferred:   marca que el gasto es una compra a meses/diferido (sus ocurrencias
--                ya están ancladas al mes de PAGO, no al de cargo).

alter table expenses
  add column if not exists purchase_date   date,
  add column if not exists total_amount     numeric,
  add column if not exists interest_amount  numeric,
  add column if not exists is_deferred      boolean not null default false;

-- Nota: en "create or replace view" las columnas NUEVAS deben ir AL FINAL del select
-- (Postgres no permite reordenar/renombrar columnas existentes de una vista).

create or replace view expenses_detail as
select
  e.id,
  e.member_id,
  e.category_id,
  e.description,
  e.amount,
  e.months_duration,
  e.start_month,
  e.start_year,
  e.is_fixed,
  e.is_active,
  e.notes,
  e.created_at,
  e.payment_method_id,
  e.is_paid,
  e.payment_date,
  e.paid_payment_method_id,
  e.recurrence_type,
  e.weekly_day,
  e.household_id,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  m.name as member_name,
  m.avatar_color as member_color,
  pm.name as payment_method_name,
  pm.type as payment_method_type,
  pm.last_four as payment_method_last_four,
  pm.bank as payment_method_bank,
  pm.color as payment_method_color,
  ppm.name as paid_payment_method_name,
  ppm.type as paid_payment_method_type,
  ppm.last_four as paid_payment_method_last_four,
  e.purchase_date,
  e.total_amount,
  e.interest_amount,
  e.is_deferred
from expenses e
left join categories c on e.category_id = c.id
left join members m on e.member_id = m.id
left join payment_methods pm on e.payment_method_id = pm.id
left join payment_methods ppm on e.paid_payment_method_id = ppm.id;

-- Esta vista pudo crearse con otro orden de columnas directo en Supabase, así que
-- se recrea desde cero (drop + create) para evitar el error de reordenar columnas.
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
  e.household_id,
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
  ppm.last_four as paid_payment_method_last_four,
  e.purchase_date,
  e.total_amount,
  e.interest_amount,
  e.is_deferred
from expense_occurrences eo
join expenses e on e.id = eo.expense_id
left join categories c on c.id = e.category_id
left join members m on m.id = e.member_id
left join payment_methods pm on pm.id = eo.payment_method_id
left join payment_methods ppm on ppm.id = eo.paid_payment_method_id;

-- Refresca el caché de esquema de PostgREST (evita PGRST204).
notify pgrst, 'reload schema';
