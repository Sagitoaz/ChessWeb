/**
 * @fileoverview Application constants and configuration
 * Vite automatically loads variables from .env files
 */

// API Configuration - Vite env variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// Mock API cho development (set false khi có backend thật)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.DEV

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  
  // User
  GET_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  UPLOAD_AVATAR: '/users/avatar',
  CHANGE_PASSWORD: '/users/password',
  
  // Stats
  GET_USER_STATS: '/users/stats',
  GET_LEADERBOARD: '/users/leaderboard',
  
  // Ranked
  JOIN_QUEUE: '/ranked/queue/join',
  LEAVE_QUEUE: '/ranked/queue/leave',
  GET_MATCH: '/ranked/matches/:id',
  GET_RANKED_HISTORY: '/ranked/history',
  GET_RANKED_STATS: '/ranked/stats',
  
  // Rooms
  CREATE_ROOM: '/rooms',
  JOIN_ROOM: '/rooms/:code/join',
  GET_ROOM: '/rooms/:code',
  LEAVE_ROOM: '/rooms/:code/leave',
  
  // Tournaments
  GET_TOURNAMENTS: '/tournaments',
  CREATE_TOURNAMENT: '/tournaments',
  GET_TOURNAMENT: '/tournaments/:id',
  JOIN_TOURNAMENT: '/tournaments/:id/join',
  WITHDRAW_TOURNAMENT: '/tournaments/:id/withdraw',
  
  // Bot
  START_BOT_GAME: '/bot/games',
  GET_BOT_MOVE: '/bot/move',
  
  // Replays
  GET_GAMES: '/games',
  GET_GAME: '/games/:id',
  SAVE_GAME: '/games',
}

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Ranked
  RANKED_JOIN_QUEUE: 'ranked:joinQueue',
  RANKED_LEAVE_QUEUE: 'ranked:leaveQueue',
  RANKED_MATCH_FOUND: 'ranked:matchFound',
  RANKED_QUEUE_STATUS: 'ranked:queueStatus',
  
  // Game
  GAME_MOVE: 'game:move',
  GAME_MOVE_UPDATE: 'game:moveUpdate',
  GAME_TIME_UPDATE: 'game:timeUpdate',
  GAME_END: 'game:end',
  GAME_RESIGN: 'game:resign',
  GAME_OFFER_DRAW: 'game:offerDraw',
  GAME_ACCEPT_DRAW: 'game:acceptDraw',
  GAME_OPPONENT_DISCONNECTED: 'game:opponentDisconnected',
  GAME_OPPONENT_RECONNECTED: 'game:opponentReconnected',
  GAME_AFK_WARNING: 'game:afkWarning',
  
  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_PLAYER_JOINED: 'room:playerJoined',
  ROOM_PLAYER_LEFT: 'room:playerLeft',
  ROOM_START_GAME: 'room:startGame',
  ROOM_GAME_STARTED: 'room:gameStarted',
  ROOM_OFFER_REMATCH: 'room:offerRematch',
  ROOM_ACCEPT_REMATCH: 'room:acceptRematch',
  ROOM_REMATCH_STARTED: 'room:rematchStarted',
  
  // Tournament
  TOURNAMENT_PLAYER_REGISTERED: 'tournament:playerRegistered',
  TOURNAMENT_PLAYER_WITHDRAWN: 'tournament:playerWithdrawn',
  TOURNAMENT_STARTED: 'tournament:started',
  TOURNAMENT_ROUND_UPDATE: 'tournament:roundUpdate',
  TOURNAMENT_MATCH_READY: 'tournament:matchReady',
}

export const GAME_MODES = {
  RANKED: 'ranked',
  ROOM: 'room',
  BOT: 'bot',
  TOURNAMENT: 'tournament',
}

export const GAME_RESULTS = {
  WHITE_WIN: 'white_win',
  BLACK_WIN: 'black_win',
  DRAW: 'draw',
  ONGOING: 'ongoing',
}

export const BOT_DIFFICULTIES = {
  EASY: { value: 'easy', name: 'Easy', elo: '500-800', depth: 1 },
  MEDIUM: { value: 'medium', name: 'Medium', elo: '800-1200', depth: 5 },
  HARD: { value: 'hard', name: 'Hard', elo: '1200-1800', depth: 10 },
  EXPERT: { value: 'expert', name: 'Expert', elo: '1800-2500', depth: 15 },
}

export const TOURNAMENT_FORMATS = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  SWISS: 'swiss',
}

export const TIME_CONTROLS = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
]

export const INCREMENTS = [
  { label: 'No increment', value: 0 },
  { label: '+5 seconds', value: 5 },
  { label: '+10 seconds', value: 10 },
  { label: '+15 seconds', value: 15 },
]

export const RANKS = [
  { min: 0, max: 800, name: 'Beginner', color: '#9CA3AF' },
  { min: 800, max: 1200, name: 'Intermediate', color: '#10B981' },
  { min: 1200, max: 1600, name: 'Advanced', color: '#3B82F6' },
  { min: 1600, max: 2000, name: 'Expert', color: '#8B5CF6' },
  { min: 2000, max: 2400, name: 'Master', color: '#F59E0B' },
  { min: 2400, max: Infinity, name: 'Grandmaster', color: '#EF4444' },
]

export const CHESS_PIECE_VALUES = {
  p: 1, // Pawn
  n: 3, // Knight
  b: 3, // Bishop
  r: 5, // Rook
  q: 9, // Queen
  k: 0, // King
}

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
}

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
}

export const INACTIVITY_WARNING_TIME = 90 // 90 seconds
export const INACTIVITY_TIMEOUT = 120 // 120 seconds (2 minutes)
export const DISCONNECT_TIMEOUT = 30 // 30 seconds

export { API_URL, SOCKET_URL, USE_MOCK }
