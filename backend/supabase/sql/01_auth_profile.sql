-- ============================================================
-- 01_auth_profile.sql
-- Owner group: Member 1 + Member 2
-- ============================================================

create table if not exists app.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  country_code varchar(5),
  language_code varchar(10) not null default 'vi',
  timezone text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('verify_email', 'reset_password')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_games int not null default 0,
  total_wins int not null default 0,
  total_losses int not null default 0,
  total_draws int not null default 0,
  win_rate numeric(5,2) not null default 0.00,
  longest_win_streak int not null default 0,
  current_streak int not null default 0,
  total_play_time_seconds int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.user_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elo_ranked int not null default 500,
  elo_bot int not null default 500,
  elo_tournament int not null default 500,
  peak_elo_ranked int not null default 500,
  peak_elo_bot int not null default 500,
  peak_elo_tournament int not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_profiles_updated_at on app.user_profiles;
create trigger trg_user_profiles_updated_at
before update on app.user_profiles
for each row execute function app.set_updated_at();

drop trigger if exists trg_user_settings_updated_at on app.user_settings;
create trigger trg_user_settings_updated_at
before update on app.user_settings
for each row execute function app.set_updated_at();

drop trigger if exists trg_user_stats_updated_at on app.user_stats;
create trigger trg_user_stats_updated_at
before update on app.user_stats
for each row execute function app.set_updated_at();

drop trigger if exists trg_user_ratings_updated_at on app.user_ratings;
create trigger trg_user_ratings_updated_at
before update on app.user_ratings
for each row execute function app.set_updated_at();
