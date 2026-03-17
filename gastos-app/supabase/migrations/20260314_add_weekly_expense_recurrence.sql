alter table expenses
  add column if not exists recurrence_type text not null default 'mensual'
    check (recurrence_type in ('mensual', 'semanal')),
  add column if not exists weekly_day int
    check (weekly_day between 0 and 6);

comment on column expenses.recurrence_type is 'Periodicidad del gasto: mensual o semanal';
comment on column expenses.weekly_day is 'Dia de la semana para gastos semanales (0=domingo, 1=lunes, ... 6=sabado)';
