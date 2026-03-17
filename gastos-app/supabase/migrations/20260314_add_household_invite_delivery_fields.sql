alter table household_invites
  add column if not exists message text,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz;

create index if not exists idx_household_invites_token on household_invites(token);
create index if not exists idx_household_invites_status on household_invites(status);
