alter table bank_movements
  add column if not exists transfer_group_id uuid;

create index if not exists idx_bank_movements_transfer_group on bank_movements(transfer_group_id);
