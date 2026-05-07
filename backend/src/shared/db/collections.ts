export const COLLECTIONS = {
  AUTH_SESSIONS: "auth_sessions",
  AUTH_TOKENS: "auth_tokens",
  BOT_MOVE_REQUESTS: "bot_move_requests",
  BOT_SESSIONS: "bot_sessions",
  DATABASE_AUDIT_EVENTS: "database_audit_events",
  GAME_MOVES: "game_moves",
  GAMES: "games",
  MATCHES: "matches",
  MATCHMAKING_QUEUE: "matchmaking_queue",
  PLAYER_MODE_STATS: "player_mode_stats",
  PLAYER_RATINGS: "player_ratings",
  RANK_TIERS: "rank_tiers",
  RATING_EVENTS: "rating_events",
  REPLAY_BOOKMARKS: "replay_bookmarks",
  ROOM_MEMBERS: "room_members",
  ROOMS: "rooms",
  TOURNAMENT_MATCHES: "tournament_matches",
  TOURNAMENT_PARTICIPANTS: "tournament_participants",
  TOURNAMENTS: "tournaments",
  USERS: "users",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
