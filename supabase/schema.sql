create schema if not exists "jd-wedding";

-- The invitation list. One row per invitation (group): `name` is who it is searched by,
-- `members` are the other people on the same invitation.
create table if not exists "jd-wedding".guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  members text[] not null default '{}'
);
alter table "jd-wedding".guests enable row level security;

create table if not exists "jd-wedding".rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest_id uuid references "jd-wedding".guests(id) on delete cascade,
  name text not null,
  email text,
  attending boolean not null,
  guests int,
  attendees text[],
  note text
);
-- For a table created by an earlier version of this file:
alter table "jd-wedding".rsvps add column if not exists guest_id uuid references "jd-wedding".guests(id) on delete cascade;
alter table "jd-wedding".rsvps add column if not exists attendees text[];
alter table "jd-wedding".rsvps alter column email drop not null;
-- One reply per invitation (replying again updates it).
create unique index if not exists rsvps_guest_id_key on "jd-wedding".rsvps (guest_id);

-- Seating plan (used by the /admin dashboard)
create table if not exists "jd-wedding".seating_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity int not null default 10 check (capacity >= 1),
  sort int not null default 0,
  pos_x real,
  pos_y real
);
-- For a table created by an earlier version of this file:
alter table "jd-wedding".seating_tables add column if not exists pos_x real;
alter table "jd-wedding".seating_tables add column if not exists pos_y real;
create table if not exists "jd-wedding".seat_assignments (
  guest_id uuid not null references "jd-wedding".guests(id) on delete cascade,
  person text not null,
  table_id uuid not null references "jd-wedding".seating_tables(id) on delete cascade,
  primary key (guest_id, person)
);
alter table "jd-wedding".seating_tables enable row level security;
alter table "jd-wedding".seat_assignments enable row level security;

-- Only the server (service role key) writes and reads these tables.
alter table "jd-wedding".rsvps enable row level security;

-- Let the service role reach the schema through the Supabase API.
-- Also add "jd-wedding" under Settings > API > Exposed schemas in the dashboard.
grant usage on schema "jd-wedding" to service_role;
grant all on all tables in schema "jd-wedding" to service_role;

-- Add your guests with supabase/seed-guests.sql
