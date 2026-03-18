-- ============================================================
-- 03_rooms.sql
-- Owner group: Member 4
-- ============================================================

create table if not exists app.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code varchar(12) not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status app.room_status not null default 'waiting',
  time_control_seconds int not null default 600,
  increment_seconds int not null default 0,
  max_players int not null default 2 check (max_players >= 2 and max_players <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references app.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

drop trigger if exists trg_rooms_updated_at on app.rooms;
create trigger trg_rooms_updated_at
before update on app.rooms
for each row execute function app.set_updated_at();
