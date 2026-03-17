alter table payment_methods
  drop constraint if exists payment_methods_type_check;

alter table payment_methods
  add constraint payment_methods_type_check
  check (type in ('tarjeta_credito', 'tarjeta_debito', 'tarjeta_vales', 'efectivo', 'transferencia'));

alter table bank_accounts
  drop constraint if exists bank_accounts_type_check;

alter table bank_accounts
  add constraint bank_accounts_type_check
  check (type in ('debito', 'credito', 'ahorro', 'inversion', 'efectivo'));

alter table income
  add column if not exists bank_account_id uuid references bank_accounts(id) on delete set null,
  add column if not exists bank_movement_id uuid references bank_movements(id) on delete set null;

drop view if exists income_detail;

create view income_detail as
select
  i.*,
  m.name as member_name,
  m.avatar_color as member_color,
  ba.name as bank_account_name,
  ba.type as bank_account_type
from income i
left join members m on i.member_id = m.id
left join bank_accounts ba on i.bank_account_id = ba.id;
