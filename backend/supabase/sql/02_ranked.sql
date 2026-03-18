-- ============================================================
-- 02_ranked.sql
-- Owner group: Member 3
-- ============================================================

create table if not exists app.ranked_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_rating int not null,
  status app.queue_status not null default 'waiting',
  joined_at timestamptz not null default now(),
  matched_at timestamptz,
  left_at timestamptz
);

create unique index if not exists uq_ranked_queue_active_user
on app.ranked_queue(user_id)
where status = 'waiting';

create table if not exists app.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  player_white_id uuid not null references auth.users(id) on delete restrict,
  player_black_id uuid not null references auth.users(id) on delete restrict,
  winner_id uuid references auth.users(id) on delete set null,
  status app.match_status not null default 'waiting',
  forfeit_reason app.end_reason,
  white_time_remaining_ms int,
  black_time_remaining_ms int,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ranked_matches_updated_at on app.ranked_matches;
create trigger trg_ranked_matches_updated_at
before update on app.ranked_matches
for each row execute function app.set_updated_at();
