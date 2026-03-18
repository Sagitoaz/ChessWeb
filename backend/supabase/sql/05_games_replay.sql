-- ============================================================
-- 05_games_replay.sql
-- Owner group: Member 2 + Member 3
-- ============================================================

create table if not exists app.games (
  id uuid primary key default gen_random_uuid(),
  white_player_id uuid not null references auth.users(id) on delete restrict,
  black_player_id uuid not null references auth.users(id) on delete restrict,
  winner_id uuid references auth.users(id) on delete set null,
  mode app.game_mode not null,
  result app.game_result not null default 'ongoing',
  end_reason app.end_reason,
  initial_fen varchar(120) not null default 'startpos',
  current_fen varchar(120),
  pgn text,
  total_moves int not null default 0,
  duration_seconds int,
  time_control_seconds int,
  increment_seconds int,
  ranked_match_id uuid references app.ranked_matches(id) on delete set null,
  room_id uuid references app.rooms(id) on delete set null,
  tournament_match_id uuid references app.tournament_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists app.game_moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references app.games(id) on delete cascade,
  ply int not null check (ply > 0),
  color text not null check (color in ('white', 'black')),
  from_square char(2) not null,
  to_square char(2) not null,
  piece char(1) not null,
  captured_piece char(1),
  promotion_piece char(1),
  san varchar(16) not null,
  uci varchar(8),
  fen_after varchar(120),
  is_check boolean not null default false,
  is_checkmate boolean not null default false,
  is_castle boolean not null default false,
  is_en_passant boolean not null default false,
  time_spent_ms int,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

create table if not exists app.elo_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references app.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_rating int not null,
  new_rating int not null,
  rating_change int not null,
  mode app.game_mode not null,
  created_at timestamptz not null default now()
);

create table if not exists app.replay_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references app.games(id) on delete cascade,
  label text,
  ply int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, ply)
);

drop trigger if exists trg_games_updated_at on app.games;
create trigger trg_games_updated_at
before update on app.games
for each row execute function app.set_updated_at();
