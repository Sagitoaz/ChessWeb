import axios from 'axios'
import { API_URL, USE_MOCK } from '../utils/constants'

/**
 * Game Service
 * Handles all game-related API calls
 */

// Create axios instance for game API
const gameAPI = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add token to headers
gameAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
gameAPI.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Game API Error:', error.response?.data || error.message)
    return Promise.reject(error.response?.data || error)
  }
)

/**
 * Mock responses for development
 */
const mockGameAPI = {
  // Ranked Match APIs
  async joinRankedQueue() {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      success: true,
      message: 'Joined ranked queue',
      queuePosition: Math.floor(Math.random() * 50) + 1,
      estimatedWaitTime: Math.floor(Math.random() * 60) + 30, // seconds
    }
  },

  async leaveRankedQueue() {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Left ranked queue',
    }
  },

  async getMatch(matchId) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      id: matchId,
      type: 'ranked',
      players: {
        white: {
          id: 1,
          username: 'player1',
          rating: 1500,
          avatarUrl: 'https://i.pravatar.cc/150?img=1',
        },
        black: {
          id: 2,
          username: 'player2',
          rating: 1480,
          avatarUrl: 'https://i.pravatar.cc/150?img=2',
        },
      },
      timeControl: {
        initial: 600, // 10 minutes
        increment: 5, // 5 seconds per move
      },
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  },

  async getRankedHistory(page = 1, limit = 10) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const matches = Array.from({ length: limit }, (_, i) => ({
      id: `match-${page}-${i}`,
      opponent: {
        username: `opponent${i + 1}`,
        rating: 1400 + Math.floor(Math.random() * 400),
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 3}`,
      },
      result: ['win', 'loss', 'draw'][Math.floor(Math.random() * 3)],
      ratingChange: [-15, 0, 15][Math.floor(Math.random() * 3)],
      playerColor: Math.random() > 0.5 ? 'white' : 'black',
      endReason: ['checkmate', 'resignation', 'timeout', 'draw'][Math.floor(Math.random() * 4)],
      moves: Math.floor(Math.random() * 50) + 20,
      duration: Math.floor(Math.random() * 1200) + 300, // seconds
      playedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    return {
      matches,
      pagination: {
        page,
        limit,
        total: 100,
        totalPages: 10,
      },
    }
  },

  async getRankedStats() {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      currentRating: 1523,
      peakRating: 1687,
      gamesPlayed: 156,
      wins: 78,
      losses: 62,
      draws: 16,
      winRate: 50.0,
      currentStreak: 3,
      bestStreak: 8,
      avgOpponentRating: 1512,
      timeControls: {
        blitz: { games: 89, rating: 1545 },
        rapid: { games: 52, rating: 1498 },
        classical: { games: 15, rating: 1512 },
      },
    }
  },

  async makeMove(matchId, move) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      move,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      timeRemaining: {
        white: 595,
        black: 600,
      },
    }
  },

  async resignGame(matchId) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Game resigned',
      result: 'loss',
      ratingChange: -12,
    }
  },

  async offerDraw(matchId) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Draw offer sent',
    }
  },

  async respondToDrawOffer(matchId, accept) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: accept ? 'Draw accepted' : 'Draw declined',
      result: accept ? 'draw' : null,
    }
  },

  // Room APIs
  async createRoom(settings) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      code: 'ROOM' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      host: {
        id: 1,
        username: 'currentUser',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      settings: {
        isPrivate: settings.isPrivate || false,
        allowSpectators: settings.allowSpectators !== false,
        timeControl: settings.timeControl || { initial: 600, increment: 5 },
        rated: settings.rated || false,
      },
      players: [],
      status: 'waiting',
      createdAt: new Date().toISOString(),
    }
  },

  async joinRoom(roomCode) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      code: roomCode,
      host: {
        id: 2,
        username: 'roomHost',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      settings: {
        isPrivate: false,
        allowSpectators: true,
        timeControl: { initial: 600, increment: 5 },
        rated: false,
      },
      players: [
        {
          id: 2,
          username: 'roomHost',
          avatarUrl: 'https://i.pravatar.cc/150?img=2',
          isReady: true,
        },
      ],
      status: 'waiting',
    }
  },

  async leaveRoom(roomCode) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Left room',
    }
  },

  async getRoom(roomCode) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    return {
      code: roomCode,
      host: {
        id: 2,
        username: 'roomHost',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      settings: {
        isPrivate: false,
        allowSpectators: true,
        timeControl: { initial: 600, increment: 5 },
        rated: false,
      },
      players: [
        {
          id: 2,
          username: 'roomHost',
          avatarUrl: 'https://i.pravatar.cc/150?img=2',
          isReady: true,
        },
      ],
      spectators: [],
      status: 'waiting',
    }
  },

  async startRoomGame(roomCode) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      success: true,
      matchId: 'match-' + Date.now(),
      message: 'Game started',
    }
  },

  // Tournament APIs
  async getTournaments(filters = {}) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const tournaments = Array.from({ length: 5 }, (_, i) => ({
      id: `tournament-${i + 1}`,
      name: `Weekly Blitz Championship ${i + 1}`,
      type: ['single-elimination', 'round-robin', 'swiss'][i % 3],
      status: ['upcoming', 'registration', 'active', 'completed'][i % 4],
      timeControl: { initial: 180, increment: 2 },
      maxPlayers: 16,
      currentPlayers: Math.floor(Math.random() * 16),
      prizePool: i > 2 ? 1000 + i * 500 : null,
      startTime: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: {
        username: 'tournamentOrganizer',
        avatarUrl: 'https://i.pravatar.cc/150?img=10',
      },
    }))

    return { tournaments }
  },

  async getTournament(tournamentId) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      id: tournamentId,
      name: 'Weekly Blitz Championship',
      description: 'Fast-paced blitz tournament for all skill levels',
      type: 'single-elimination',
      status: 'registration',
      timeControl: { initial: 180, increment: 2 },
      maxPlayers: 16,
      participants: Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        username: `player${i + 1}`,
        rating: 1400 + Math.floor(Math.random() * 400),
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
      })),
      rounds: [],
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      prizePool: 1000,
      createdBy: {
        username: 'tournamentOrganizer',
        avatarUrl: 'https://i.pravatar.cc/150?img=10',
      },
    }
  },

  async joinTournament(tournamentId) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      success: true,
      message: 'Joined tournament',
      tournamentId,
    }
  },

  async withdrawTournament(tournamentId) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Withdrawn from tournament',
      tournamentId,
    }
  },

  async createTournament(data) {
    await new Promise((resolve) => setTimeout(resolve, 700))
    return {
      id: 'tournament-' + Date.now(),
      ...data,
      status: 'registration',
      currentPlayers: 0,
      createdAt: new Date().toISOString(),
    }
  },
  // =============================================
  // BOT GAME APIs (mock) — theo S1_StartBotGame.puml
  // =============================================

  // POST /games/bot { level }
  // level: 1=Easy, 2=Medium, 3=Hard, 4=Expert (BotConfig.fromDifficulty)
  async startBotGame(level) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const botNames = { 1: 'Bot (Easy)', 2: 'Bot (Medium)', 3: 'Bot (Hard)', 4: 'Bot (Expert)' }
    const botRatings = { 1: 600, 2: 900, 3: 1600, 4: 2200 }
    const playerColor = Math.random() > 0.5 ? 'White' : 'Black'
    return {
      gameId: `game-${Date.now()}`,
      sessionId: `session-${Date.now()}`, // BotSession.sessionId
      initialFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor, // 'White' | 'Black'
      config: {
        // BotConfig.fromDifficulty(level)
        difficulty: level,
        depth: [8, 15, 20, 25][level - 1],
        skillLevel: [2, 5, 15, 20][level - 1],
        timeLimitMs: [100, 1000, 3000, 5000][level - 1],
        engine: 'stockfish',
      },
      botPlayer: {
        id: `bot-level-${level}`,
        username: botNames[level],
        color: playerColor === 'White' ? 'Black' : 'White',
        isBot: true,
        rating: botRatings[level],
      },
      humanPlayer: { id: 'user-local', username: 'You', color: playerColor, isBot: false },
      status: 'Waiting', // GameState.Waiting
    }
  },

  // POST /games/{gameId}/moves { move }
  async submitPlayerMove(gameId, move) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { success: true, fen: null }
  },

  async getBotMove(sessionId, fen) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return {
      sessionId,
      move: {
        bestMoveUci: 'e2e4',
        evaluation: 0,
      },
      fen,
    }
  },

  async pauseBotGame(gameId) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { success: true, state: 'Paused' }
  },

  async resumeBotGame(gameId) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { success: true, state: 'InGame' }
  },

  // UC6: Save Game — SM: Finished → Saved
  async saveBotGame(gameId, gameData) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    return {
      success: true,
      savedGame: { id: gameId, state: 'Saved', finishedAt: new Date().toISOString() },
    }
  },
  // =============================================
  // REPLAY / HISTORY APIs (mock) — theo S2_LoadReplay.puml
  // =============================================

  // GET /games?mode=&result= — lấy danh sách lịch sử
  async getGameHistory(filters = {}) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const data = await import('../mocks/botGames.json')
    let games = [...(data.default ?? data).games]
    // filter theo GameMode enum: HumanVsBot | HumanVsHuman
    if (filters.mode) games = games.filter((g) => g.mode === filters.mode)
    // filter theo GameResult enum: WhiteWin | BlackWin | Draw
    if (filters.result) games = games.filter((g) => g.result === filters.result)
    games.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { games, total: games.length }
  },

  // GET /games/{gameId} — S2_LoadReplay.puml
  // Chỉ cho replay nếu state === 'Saved'
  async getGame(gameId) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const data = await import('../mocks/botGames.json')
    const game = (data.default ?? data).games.find((g) => g.id === gameId)
    if (!game) {
      const e = new Error('Game not found')
      e.status = 404
      throw e
    }
    // S2: validate state === 'Saved'
    if (game.state !== 'Saved') {
      const e = new Error('Replay not available')
      e.status = 422
      throw e
    }
    return game
  },
}

/**
 * Game Service API
 */
const gameService = {
  // Ranked Match APIs
  joinRankedQueue: () => {
    if (USE_MOCK) return mockGameAPI.joinRankedQueue()
    return gameAPI.post('/ranked/queue/join')
  },

  leaveRankedQueue: () => {
    if (USE_MOCK) return mockGameAPI.leaveRankedQueue()
    return gameAPI.post('/ranked/queue/leave')
  },

  getMatch: (matchId) => {
    if (USE_MOCK) return mockGameAPI.getMatch(matchId)
    return gameAPI.get(`/ranked/matches/${matchId}`)
  },

  getRankedHistory: (page = 1, limit = 10) => {
    if (USE_MOCK) return mockGameAPI.getRankedHistory(page, limit)
    return gameAPI.get('/ranked/history', { params: { page, limit } })
  },

  getRankedStats: () => {
    if (USE_MOCK) return mockGameAPI.getRankedStats()
    return gameAPI.get('/ranked/stats')
  },

  makeMove: (matchId, move) => {
    if (USE_MOCK) return mockGameAPI.makeMove(matchId, move)
    return gameAPI.post(`/game/${matchId}/move`, { move })
  },

  resignGame: (matchId) => {
    if (USE_MOCK) return mockGameAPI.resignGame(matchId)
    return gameAPI.post(`/game/${matchId}/resign`)
  },

  offerDraw: (matchId) => {
    if (USE_MOCK) return mockGameAPI.offerDraw(matchId)
    return gameAPI.post(`/game/${matchId}/draw/offer`)
  },

  respondToDrawOffer: (matchId, accept) => {
    if (USE_MOCK) return mockGameAPI.respondToDrawOffer(matchId, accept)
    return gameAPI.post(`/game/${matchId}/draw/respond`, { accept })
  },

  // Room APIs
  createRoom: (settings) => {
    if (USE_MOCK) return mockGameAPI.createRoom(settings)
    return gameAPI.post('/rooms', settings)
  },

  joinRoom: (roomCode) => {
    if (USE_MOCK) return mockGameAPI.joinRoom(roomCode)
    return gameAPI.post(`/rooms/${roomCode}/join`)
  },

  leaveRoom: (roomCode) => {
    if (USE_MOCK) return mockGameAPI.leaveRoom(roomCode)
    return gameAPI.post(`/rooms/${roomCode}/leave`)
  },

  getRoom: (roomCode) => {
    if (USE_MOCK) return mockGameAPI.getRoom(roomCode)
    return gameAPI.get(`/rooms/${roomCode}`)
  },

  startRoomGame: (roomCode) => {
    if (USE_MOCK) return mockGameAPI.startRoomGame(roomCode)
    return gameAPI.post(`/rooms/${roomCode}/start`)
  },

  // Tournament APIs
  getTournaments: (filters = {}) => {
    if (USE_MOCK) return mockGameAPI.getTournaments(filters)
    return gameAPI.get('/tournaments', { params: filters })
  },

  getTournament: (tournamentId) => {
    if (USE_MOCK) return mockGameAPI.getTournament(tournamentId)
    return gameAPI.get(`/tournaments/${tournamentId}`)
  },

  joinTournament: (tournamentId) => {
    if (USE_MOCK) return mockGameAPI.joinTournament(tournamentId)
    return gameAPI.post(`/tournaments/${tournamentId}/join`)
  },

  withdrawTournament: (tournamentId) => {
    if (USE_MOCK) return mockGameAPI.withdrawTournament(tournamentId)
    return gameAPI.post(`/tournaments/${tournamentId}/withdraw`)
  },

  createTournament: (data) => {
    if (USE_MOCK) return mockGameAPI.createTournament(data)
    return gameAPI.post('/tournaments', data)
  },
}

export default gameService

// =============================================
// BOT GAME APIs — theo S1_StartBotGame.puml
// =============================================
export const botGameAPI = {
  /**
   * POST /games/bot { level }
   * level: 1=Easy, 2=Medium, 3=Hard, 4=Expert
   * 201: { gameId, sessionId, initialFEN, playerColor, config, botPlayer, humanPlayer, status:'Waiting' }
   * Errors: 401, 422 (invalid level), 429, 503 (bot unavailable), 504
   */
  startBotGame: async (level) => {
    if (USE_MOCK) return mockGameAPI.startBotGame(level)

    const difficultyMap = {
      1: 'beginner',
      2: 'intermediate',
      3: 'advanced',
      4: 'expert',
    }

    const response = await gameAPI.post('/bot/games', {
      difficulty: difficultyMap[level] || 'intermediate',
      preferredColor: 'white',
    })

    const data = response?.data ?? response
    return {
      ...data,
      initialFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'White',
      config: {
        timeLimitMs: 500,
      },
      status: 'InGame',
    }
  },

  /**
   * POST /games/{gameId}/moves { move: { from, to, promotion? } }
   * Backend tự gọi POST /bot/move { sessionId, FEN } → Stockfish — frontend KHÔNG gọi trực tiếp
   * 200: { gameFinished, fen, lastMove } | { gameFinished: true, result, finalFEN }
   * Errors: 400, 401, 403, 404, 409 (not your turn), 422 (illegal move), 503, 504
   */
  submitPlayerMove: (gameId, move) =>
    USE_MOCK
      ? mockGameAPI.submitPlayerMove(gameId, move)
      : gameAPI.post(`/games/${gameId}/moves`, { move }),

  getBotMove: async (sessionId, fen) => {
    if (USE_MOCK) {
      return mockGameAPI.getBotMove(sessionId, fen)
    }
    const response = await gameAPI.post('/bot/move', { sessionId, fen })
    return response?.data ?? response
  },

  pauseBotGame: (gameId) =>
    USE_MOCK
      ? mockGameAPI.pauseBotGame(gameId)
      : gameAPI.patch(`/games/${gameId}/state`, { action: 'pause' }),

  resumeBotGame: (gameId) =>
    USE_MOCK
      ? mockGameAPI.resumeBotGame(gameId)
      : gameAPI.patch(`/games/${gameId}/state`, { action: 'resume' }),

  /**
   * UC6: Save Game to History — SM: Finished → Saved
   */
  saveBotGame: (gameId, data) =>
    USE_MOCK ? mockGameAPI.saveBotGame(gameId, data) : gameAPI.post(`/games/${gameId}/save`, data),
}

// =============================================
// REPLAY / HISTORY APIs — theo S2_LoadReplay.puml
// =============================================
export const replayAPI = {
  /**
   * GET /games/{gameId}
   * Kiểm tra state === 'Saved' trước khi cho replay
   * Errors: 400, 401, 403, 404, 429, 503, 504
   */
  getGame: (gameId) => (USE_MOCK ? mockGameAPI.getGame(gameId) : gameAPI.get(`/games/${gameId}`)),

  /**
   * GET /games?mode=HumanVsBot|HumanVsHuman&result=WhiteWin|BlackWin|Draw
   */
  getGameHistory: (filters = {}) =>
    USE_MOCK ? mockGameAPI.getGameHistory(filters) : gameAPI.get('/games', { params: filters }),
}
