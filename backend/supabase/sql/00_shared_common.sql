-- ============================================================
-- 00_shared_common.sql
-- Shared database foundation for Supabase/PostgreSQL
-- Run first
-- ============================================================

create extension if not exists "pgcrypto";

create schema if not exists app;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_mode') then
    create type app.game_mode as enum ('ranked', 'room', 'tournament', 'bot');
  end if;

  if not exists (select 1 from pg_type where typname = 'game_result') then
    create type app.game_result as enum ('white_win', 'black_win', 'draw', 'ongoing', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'end_reason') then
    create type app.end_reason as enum (
      'checkmate', 'resignation', 'timeout', 'draw_agreement',
      'stalemate', 'afk', 'disconnect', 'abandoned'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'queue_status') then
    create type app.queue_status as enum ('waiting', 'matched', 'left');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type app.match_status as enum ('waiting', 'playing', 'finished', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type app.room_status as enum ('waiting', 'playing', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'tournament_status') then
    create type app.tournament_status as enum ('draft', 'open', 'ongoing', 'finished', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'tournament_format') then
    create type app.tournament_format as enum ('single_elimination', 'double_elimination', 'round_robin', 'swiss');
  end if;

  if not exists (select 1 from pg_type where typname = 'bot_difficulty') then
    create type app.bot_difficulty as enum ('easy', 'medium', 'hard', 'expert');
  end if;
end
$$;

create table if not exists app.rank_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  min_elo int not null,
  max_elo int not null,
  color_hex text not null,
  created_at timestamptz not null default now()
);
