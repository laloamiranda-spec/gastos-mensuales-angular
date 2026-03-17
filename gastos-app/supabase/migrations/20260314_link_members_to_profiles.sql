alter table members
  add column if not exists profile_id uuid references profiles(id) on delete set null;

create unique index if not exists idx_members_profile_unique
  on members(profile_id)
  where profile_id is not null;
