alter table payment_methods
  add column if not exists billing_cutoff_day int check (billing_cutoff_day between 1 and 31),
  add column if not exists payment_due_day int check (payment_due_day between 1 and 31);
