alter table households
  drop constraint if exists households_slug_key;

drop index if exists households_slug_key;

create unique index if not exists idx_households_owner_slug_unique
  on households(owner_user_id, slug)
  where slug is not null and owner_user_id is not null;
