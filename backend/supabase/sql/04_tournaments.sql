-- ============================================================
-- 04_tournaments.sql
-- Owner group: Member 3 + Member 4
-- ============================================================

create table if not exists app.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  creator_id uuid not null references auth.users(id) on delete cascade,
  format app.tournament_format not null default 'single_elimination',
  status app.tournament_status not null default 'draft',
  max_players int not null check (max_players >= 2),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references app.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_no int,
  joined_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (tournament_id, user_id)
);

create table if not exists app.tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references app.tournaments(id) on delete cascade,
  round_no int not null,
  started_at timestamptz,
  ended_at timestamptz,
  unique (tournament_id, round_no)
);

create table if not exists app.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references app.tournaments(id) on delete cascade,
  round_id uuid references app.tournament_rounds(id) on delete set null,
  player_white_id uuid references auth.users(id) on delete set null,
  player_black_id uuid references auth.users(id) on delete set null,
  winner_id uuid references auth.users(id) on delete set null,
  status app.match_status not null default 'waiting',
  game_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tournaments_updated_at on app.tournaments;
create trigger trg_tournaments_updated_at
before update on app.tournaments
for each row execute function app.set_updated_at();

drop trigger if exists trg_tournament_matches_updated_at on app.tournament_matches;
create trigger trg_tournament_matches_updated_at
before update on app.tournament_matches
for each row execute function app.set_updated_at();
