-- ============================================================
-- 07_security_rls.sql
-- Shared security policies
-- ============================================================

alter table app.user_profiles enable row level security;
alter table app.user_settings enable row level security;
alter table app.refresh_tokens enable row level security;
alter table app.user_stats enable row level security;
alter table app.user_ratings enable row level security;
alter table app.ranked_queue enable row level security;
alter table app.ranked_matches enable row level security;
alter table app.rooms enable row level security;
alter table app.room_members enable row level security;
alter table app.tournaments enable row level security;
alter table app.tournament_participants enable row level security;
alter table app.games enable row level security;
alter table app.game_moves enable row level security;
alter table app.elo_history enable row level security;
alter table app.replay_bookmarks enable row level security;
alter table app.bot_sessions enable row level security;
alter table app.bot_move_requests enable row level security;

drop policy if exists p_user_profiles_select on app.user_profiles;
create policy p_user_profiles_select on app.user_profiles
for select using (true);

drop policy if exists p_user_profiles_write on app.user_profiles;
create policy p_user_profiles_write on app.user_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_user_settings_owner on app.user_settings;
create policy p_user_settings_owner on app.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_refresh_tokens_owner on app.refresh_tokens;
create policy p_refresh_tokens_owner on app.refresh_tokens
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_user_stats_select on app.user_stats;
create policy p_user_stats_select on app.user_stats
for select using (true);

drop policy if exists p_user_ratings_select on app.user_ratings;
create policy p_user_ratings_select on app.user_ratings
for select using (true);

drop policy if exists p_ranked_queue_owner on app.ranked_queue;
create policy p_ranked_queue_owner on app.ranked_queue
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_ranked_matches_player_select on app.ranked_matches;
create policy p_ranked_matches_player_select on app.ranked_matches
for select using (auth.uid() = player_white_id or auth.uid() = player_black_id or auth.uid() = winner_id);

drop policy if exists p_rooms_owner_write on app.rooms;
create policy p_rooms_owner_write on app.rooms
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists p_rooms_select on app.rooms;
create policy p_rooms_select on app.rooms
for select using (true);

drop policy if exists p_room_members_owner on app.room_members;
create policy p_room_members_owner on app.room_members
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_tournaments_select on app.tournaments;
create policy p_tournaments_select on app.tournaments
for select using (true);

drop policy if exists p_tournaments_creator_write on app.tournaments;
create policy p_tournaments_creator_write on app.tournaments
for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists p_tournament_participants_owner on app.tournament_participants;
create policy p_tournament_participants_owner on app.tournament_participants
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_games_player_select on app.games;
create policy p_games_player_select on app.games
for select using (auth.uid() = white_player_id or auth.uid() = black_player_id or auth.uid() = winner_id);

drop policy if exists p_game_moves_player_select on app.game_moves;
create policy p_game_moves_player_select on app.game_moves
for select using (
  exists (
    select 1 from app.games g
    where g.id = game_id
      and (auth.uid() = g.white_player_id or auth.uid() = g.black_player_id or auth.uid() = g.winner_id)
  )
);

drop policy if exists p_elo_history_owner_select on app.elo_history;
create policy p_elo_history_owner_select on app.elo_history
for select using (auth.uid() = user_id);

drop policy if exists p_replay_bookmarks_owner on app.replay_bookmarks;
create policy p_replay_bookmarks_owner on app.replay_bookmarks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_bot_sessions_owner on app.bot_sessions;
create policy p_bot_sessions_owner on app.bot_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists p_bot_move_requests_owner on app.bot_move_requests;
create policy p_bot_move_requests_owner on app.bot_move_requests
for select using (
  exists (
    select 1 from app.bot_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
);
