-- ============================================================
-- 09_indexes.sql
-- Performance indexes
-- ============================================================

create index if not exists idx_user_profiles_username on app.user_profiles(username);
create index if not exists idx_refresh_tokens_user_id on app.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires_at on app.refresh_tokens(expires_at);

create index if not exists idx_ranked_queue_status on app.ranked_queue(status);
create index if not exists idx_ranked_matches_status on app.ranked_matches(status);
create index if not exists idx_ranked_matches_created_at on app.ranked_matches(created_at);

create index if not exists idx_rooms_owner_id on app.rooms(owner_id);
create index if not exists idx_room_members_room_id on app.room_members(room_id);
create index if not exists idx_room_members_user_id on app.room_members(user_id);

create index if not exists idx_tournaments_status on app.tournaments(status);
create index if not exists idx_tournaments_creator_id on app.tournaments(creator_id);
create index if not exists idx_tournament_participants_tournament_id on app.tournament_participants(tournament_id);
create index if not exists idx_tournament_matches_tournament_id on app.tournament_matches(tournament_id);

create index if not exists idx_games_mode on app.games(mode);
create index if not exists idx_games_created_at on app.games(created_at);
create index if not exists idx_games_white_player_id on app.games(white_player_id);
create index if not exists idx_games_black_player_id on app.games(black_player_id);
create index if not exists idx_game_moves_game_id on app.game_moves(game_id);
create index if not exists idx_elo_history_user_id on app.elo_history(user_id);
create index if not exists idx_elo_history_created_at on app.elo_history(created_at);

create index if not exists idx_bot_sessions_user_id on app.bot_sessions(user_id);
create index if not exists idx_bot_sessions_status on app.bot_sessions(status);
create index if not exists idx_bot_move_requests_session_id on app.bot_move_requests(session_id);
