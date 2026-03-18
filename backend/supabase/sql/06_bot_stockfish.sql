-- ============================================================
-- 06_bot_stockfish.sql
-- Owner group: Member 4
-- ============================================================

create table if not exists app.bot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid unique references app.games(id) on delete cascade,
  difficulty app.bot_difficulty not null,
  engine_provider text not null default 'stockfish-api',
  engine_version text,
  status app.match_status not null default 'playing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.bot_move_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references app.bot_sessions(id) on delete cascade,
  game_id uuid not null references app.games(id) on delete cascade,
  request_fen varchar(120) not null,
  request_depth int,
  response_uci varchar(8),
  response_san varchar(16),
  response_eval numeric(8,2),
  provider_latency_ms int,
  provider_status text,
  provider_error text,
  created_at timestamptz not null default now()
);

alter table app.games
add column if not exists bot_session_id uuid references app.bot_sessions(id) on delete set null;

drop trigger if exists trg_bot_sessions_updated_at on app.bot_sessions;
create trigger trg_bot_sessions_updated_at
before update on app.bot_sessions
for each row execute function app.set_updated_at();
