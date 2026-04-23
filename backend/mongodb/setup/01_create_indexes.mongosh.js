const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

appDb.user_profiles.createIndex({ username: 1 }, { unique: true, name: 'uq_user_profiles_username' })
appDb.user_profiles.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    name: 'uq_user_profiles_email'
  }
)
appDb.user_profiles.createIndex(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string' } },
    name: 'uq_user_profiles_googleId'
  }
)

appDb.refresh_tokens.createIndex({ tokenHash: 1 }, { unique: true, name: 'uq_refresh_tokens_tokenHash' })
appDb.refresh_tokens.createIndex({ userId: 1, expiresAt: 1 }, { name: 'idx_refresh_tokens_user_expires' })

appDb.email_verification_tokens.createIndex({ tokenHash: 1 }, { unique: true, name: 'uq_email_verif_tokenHash' })
appDb.email_verification_tokens.createIndex({ userId: 1, purpose: 1 }, { name: 'idx_email_verif_user_purpose' })

appDb.ranked_queue.createIndex(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'waiting' }, name: 'uq_ranked_queue_active_user' }
)
appDb.ranked_queue.createIndex({ status: 1, joinedAt: 1 }, { name: 'idx_ranked_queue_status_joinedAt' })

appDb.ranked_matches.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_ranked_matches_status_createdAt' })

appDb.rooms.createIndex({ roomCode: 1 }, { unique: true, name: 'uq_rooms_roomCode' })
appDb.room_members.createIndex({ roomId: 1, userId: 1 }, { unique: true, name: 'uq_room_members_room_user' })

appDb.tournaments.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_tournaments_status_createdAt' })
appDb.tournament_participants.createIndex(
  { tournamentId: 1, userId: 1 },
  { unique: true, name: 'uq_tournament_participants_tour_user' }
)

appDb.games.createIndex({ mode: 1, createdAt: -1 }, { name: 'idx_games_mode_createdAt' })
appDb.games.createIndex({ whitePlayerId: 1, blackPlayerId: 1, createdAt: -1 }, { name: 'idx_games_players_createdAt' })
appDb.game_moves.createIndex({ gameId: 1, ply: 1 }, { unique: true, name: 'uq_game_moves_game_ply' })
appDb.elo_history.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_elo_history_user_createdAt' })

appDb.bot_sessions.createIndex({ userId: 1, status: 1, startedAt: -1 }, { name: 'idx_bot_sessions_user_status' })
appDb.bot_move_requests.createIndex({ sessionId: 1, createdAt: -1 }, { name: 'idx_bot_move_requests_session_createdAt' })

print(`[ok] Indexes created/ensured in database: ${DB_NAME}`)
