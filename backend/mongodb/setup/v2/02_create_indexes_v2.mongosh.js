const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

appDb.users.createIndex({ username: 1 }, { unique: true, name: 'uq_users_username' })
appDb.users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } }, name: 'uq_users_email' }
)
appDb.users.createIndex(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } }, name: 'uq_users_googleId' }
)
appDb.users.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_users_status_createdAt' })

appDb.auth_sessions.createIndex({ userId: 1, status: 1, createdAt: -1 }, { name: 'idx_auth_sessions_user_status_createdAt' })
appDb.auth_tokens.createIndex({ tokenHash: 1 }, { unique: true, name: 'uq_auth_tokens_tokenHash' })
appDb.auth_tokens.createIndex({ userId: 1, purpose: 1, expiresAt: 1 }, { name: 'idx_auth_tokens_user_purpose_expiresAt' })
appDb.auth_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_auth_tokens_expiresAt' })

appDb.player_ratings.createIndex({ userId: 1, mode: 1 }, { unique: true, name: 'uq_player_ratings_user_mode' })
appDb.player_ratings.createIndex({ mode: 1, rating: -1, peakRating: -1, userId: 1 }, { name: 'idx_player_ratings_mode_rating' })
appDb.rating_events.createIndex({ userId: 1, mode: 1, createdAt: -1 }, { name: 'idx_rating_events_user_mode_createdAt' })
appDb.rating_events.createIndex({ gameId: 1, userId: 1, mode: 1 }, { unique: true, name: 'uq_rating_events_game_user_mode' })

appDb.player_mode_stats.createIndex({ userId: 1, mode: 1 }, { unique: true, name: 'uq_player_mode_stats_user_mode' })
appDb.player_mode_stats.createIndex({ mode: 1, gamesPlayed: -1 }, { name: 'idx_player_mode_stats_mode_gamesPlayed' })

appDb.matchmaking_queue.createIndex(
  { userId: 1, mode: 1, timeControl: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'waiting' }, name: 'uq_matchmaking_queue_waiting_user_mode_time' }
)
appDb.matchmaking_queue.createIndex({ status: 1, mode: 1, timeControl: 1, joinedAt: 1, _id: 1 }, { name: 'idx_matchmaking_queue_waiting_scan' })
appDb.matches.createIndex({ status: 1, mode: 1, createdAt: -1 }, { name: 'idx_matches_status_mode_createdAt' })
appDb.matches.createIndex({ gameId: 1 }, { unique: true, partialFilterExpression: { gameId: { $type: 'objectId' } }, name: 'uq_matches_gameId' })
appDb.matches.createIndex({ 'players.userId': 1, status: 1, createdAt: -1 }, { name: 'idx_matches_player_status_createdAt' })

appDb.rooms.createIndex({ roomCode: 1 }, { unique: true, name: 'uq_rooms_roomCode' })
appDb.rooms.createIndex({ status: 1, isPrivate: 1, updatedAt: -1 }, { name: 'idx_rooms_status_public_updatedAt' })
appDb.room_members.createIndex({ roomId: 1, userId: 1 }, { unique: true, name: 'uq_room_members_room_user' })

appDb.tournaments.createIndex({ status: 1, startAt: 1, createdAt: -1 }, { name: 'idx_tournaments_status_startAt_createdAt' })
appDb.tournament_participants.createIndex({ tournamentId: 1, userId: 1 }, { unique: true, name: 'uq_tournament_participants_tournament_user' })
appDb.tournament_matches.createIndex({ tournamentId: 1, roundNumber: 1, matchNumber: 1 }, { unique: true, name: 'uq_tournament_matches_round_match' })
appDb.tournament_matches.createIndex({ gameId: 1 }, { unique: true, partialFilterExpression: { gameId: { $type: 'objectId' } }, name: 'uq_tournament_matches_gameId' })

appDb.games.createIndex({ mode: 1, status: 1, createdAt: -1 }, { name: 'idx_games_mode_status_createdAt' })
appDb.games.createIndex({ 'players.userId': 1, finishedAt: -1, createdAt: -1 }, { name: 'idx_games_player_finishedAt_createdAt' })
appDb.games.createIndex({ tournamentId: 1, createdAt: -1 }, { partialFilterExpression: { tournamentId: { $type: 'objectId' } }, name: 'idx_games_tournament_createdAt' })
appDb.game_moves.createIndex({ gameId: 1, ply: 1 }, { unique: true, name: 'uq_game_moves_game_ply' })
appDb.game_moves.createIndex({ gameId: 1, createdAt: 1 }, { name: 'idx_game_moves_game_createdAt' })
appDb.replay_bookmarks.createIndex({ userId: 1, gameId: 1, createdAt: -1 }, { name: 'idx_replay_bookmarks_user_game_createdAt' })

appDb.bot_sessions.createIndex({ userId: 1, status: 1, startedAt: -1 }, { name: 'idx_bot_sessions_user_status_startedAt' })
appDb.bot_move_requests.createIndex({ sessionId: 1, createdAt: -1 }, { name: 'idx_bot_move_requests_session_createdAt' })

appDb.rank_tiers.createIndex({ code: 1 }, { unique: true, name: 'uq_rank_tiers_code' })

appDb.database_audit_events.createIndex({ actorUserId: 1, createdAt: -1 }, { name: 'idx_database_audit_events_actor_createdAt' })
appDb.database_audit_events.createIndex({ entityType: 1, entityId: 1, createdAt: -1 }, { name: 'idx_database_audit_events_entity_createdAt' })

print(`[ok] v2 indexes created/ensured in database: ${DB_NAME}`)
