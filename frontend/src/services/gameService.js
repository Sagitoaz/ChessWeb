import api from './api'

/**
 * Game Service
 * Handles all game-related API calls
 */

// Reuse shared auth-aware API client so bot requests get refresh-token handling too.
const gameAPI = api

const unwrapApiEnvelope = (payload) => payload?.data ?? payload
const USER_GAMES_CACHE_TTL_MS = 20000
const userGamesCache = new Map()
const BOT_THINKING_PROFILES = {
  easy: { timeLimitMs: 600, requestTimeoutMs: 8000, rating: 700, depth: 8 },
  normal: { timeLimitMs: 1600, requestTimeoutMs: 10000, rating: 1250, depth: 14 },
  hard: { timeLimitMs: 4200, requestTimeoutMs: 16000, rating: 1900, depth: 22 },
  super_hard: { timeLimitMs: 18000, requestTimeoutMs: 30000, rating: 3200, depth: 40 },
}
const clearPublicRoomsCache = () => {
  // No-op: public rooms should always be fetched fresh to avoid stale room visibility.
}

const normalizeRankedResult = (result, playerColor = null) => {
  const v = typeof result === 'string' ? result.toLowerCase() : ''
  if (v === 'win') return 'win'
  if (v === 'lose' || v === 'loss') return 'loss'
  if (v === 'white_win' || v === 'whitewin' || v === '1-0' || v === 'white') {
    if (playerColor === 'white') return 'win'
    if (playerColor === 'black') return 'loss'
    return 'win'
  }
  if (v === 'black_win' || v === 'blackwin' || v === '0-1' || v === 'black') {
    if (playerColor === 'black') return 'win'
    if (playerColor === 'white') return 'loss'
    return 'loss'
  }
  return 'draw'
}

const normalizeEndReason = (reason, result) => {
  const value = typeof reason === 'string' ? reason.trim().toLowerCase() : ''

  if (
    value === 'checkmate' ||
    value === 'resignation' ||
    value === 'forfeit' ||
    value === 'timeout' ||
    value === 'stalemate' ||
    value === 'draw' ||
    value === 'aborted' ||
    value === 'completed'
  ) {
    return value
  }

  if (
    value === 'forfeit_leave' ||
    value === 'forfeit_navigation' ||
    value === 'manual_forfeit' ||
    value === 'disconnect_forfeit' ||
    value === 'no_show_forfeit'
  ) {
    return 'forfeit'
  }

  if (
    value === 'draw_agreement' ||
    value === 'agreement_draw' ||
    value === 'threefold_repetition' ||
    value === 'insufficient_material' ||
    value === 'fifty_move_rule' ||
    value === '1/2-1/2'
  ) {
    return 'draw'
  }

  if (value === 'time_out' || value === 'out_of_time' || value === 'flag') {
    return 'timeout'
  }

  if (value === 'abort') return 'aborted'
  if (value === 'game_end') return 'completed'

  return result === 'draw' ? 'draw' : 'completed'
}

const normalizeRankedHistory = (payload) => {
  const data = unwrapApiEnvelope(payload)
  const items = Array.isArray(data?.matches)
    ? data.matches
    : Array.isArray(data?.items)
      ? data.items
      : []

  const matches = items.map((item) => {
    const playerColor = item.playerColor || item.color || 'white'
    const rawResult =
      item.result !== undefined && item.result !== null && item.result !== ''
        ? item.result
        : item.absoluteResult
    const result = normalizeRankedResult(rawResult, playerColor)

    return {
      id: item.id || item.gameId || item._id,
      opponent: {
        username:
          item.opponent?.username ||
          item.opponentUsername ||
          item.blackUsername ||
          item.whiteUsername ||
          item.opponentId ||
          'Unknown',
        rating: Number(item.opponent?.rating ?? item.opponentRating ?? item.rating ?? 1200),
        avatarUrl: item.opponent?.avatarUrl || item.opponentAvatarUrl || null,
      },
      result,
      ratingChange: Number(item.ratingChange || item.eloChange || 0),
      playerColor,
      endReason: normalizeEndReason(item.endReason || item.finishReason || '', result),
      moves: Number(item.moves || item.totalMoves || 0),
      duration: Number(item.duration || item.durationSeconds || 0),
      playedAt: item.playedAt || item.finishedAt || item.createdAt || new Date().toISOString(),
    }
  })

  const page = Number(data?.pagination?.page || data?.page || 1)
  const pageSize = Number(
    data?.pagination?.pageSize || data?.pagination?.limit || data?.pageSize || 10
  )
  const total = Number(data?.pagination?.total || data?.total || matches.length)
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))

  return {
    matches,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  }
}

const normalizeRankedStats = (payload) => {
  const data = unwrapApiEnvelope(payload)
  const gamesPlayed = Number(data?.gamesPlayed ?? data?.totalGames ?? 0)
  const wins = Number(data?.wins ?? 0)
  const losses = Number(data?.losses ?? 0)
  const draws = Number(data?.draws ?? 0)
  const computedWinRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0

  return {
    currentRating: Number(data?.currentRating ?? data?.rating ?? 1200),
    peakRating: Number(data?.peakRating ?? data?.currentRating ?? data?.rating ?? 1200),
    gamesPlayed,
    wins,
    losses,
    draws,
    winRate: Number(data?.winRate ?? computedWinRate ?? 0),
    currentStreak: Number(data?.currentStreak ?? 0),
    currentStreakType:
      data?.currentStreakType === 'win' || data?.currentStreakType === 'lose'
        ? data.currentStreakType
        : null,
    bestStreak: Number(data?.bestStreak ?? 0),
    bestStreakType:
      data?.bestStreakType === 'win' || data?.bestStreakType === 'lose'
        ? data.bestStreakType
        : null,
    avgOpponentRating: Number(data?.avgOpponentRating ?? 0),
    timeControls:
      data?.timeControls && typeof data.timeControls === 'object' ? data.timeControls : {},
    ratingHistory: Array.isArray(data?.ratingHistory) ? data.ratingHistory : [],
    monthlyPerformance: Array.isArray(data?.monthlyPerformance) ? data.monthlyPerformance : [],
  }
}

/**
 * Mock responses for development
 */
const _mockGameAPI = {
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
      currentStreakType: 'win',
      bestStreak: 8,
      bestStreakType: 'win',
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

  async resignGame(_matchId) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      success: true,
      message: 'Game resigned',
      result: 'loss',
      ratingChange: -12,
    }
  },

  async offerDraw(_matchId) {
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

  async leaveRoom(_roomCode) {
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

  async startRoomGame(_roomCode) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      success: true,
      matchId: 'match-' + Date.now(),
      message: 'Game started',
    }
  },

  // Tournament APIs
  async getTournaments(_filters = {}) {
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
  async submitPlayerMove(_gameId, _move) {
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

  async pauseBotGame(_gameId) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { success: true, state: 'Paused' }
  },

  async resumeBotGame(_gameId) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { success: true, state: 'InGame' }
  },

  // UC6: Save Game — SM: Finished → Saved
  async saveBotGame(gameId, _gameData) {
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
void _mockGameAPI

/**
 * Game Service API
 */
const gameService = {
  // Ranked Match APIs
  joinRankedQueue: () => gameAPI.post('/ranked/queue/join'),

  leaveRankedQueue: () => gameAPI.post('/ranked/queue/leave'),

  getMatch: (matchId) => gameAPI.get(`/ranked/matches/${matchId}`),

  completeRankedMatch: (matchId, data) => gameAPI.post(`/ranked/matches/${matchId}/complete`, data),

  getRankedHistory: async (page = 1, limit = 10) => {
    const response = await gameAPI.get('/ranked/history', { params: { page, pageSize: limit } })
    return normalizeRankedHistory(response)
  },

  getRankedStats: async () => {
    const response = await gameAPI.get('/ranked/stats')
    return normalizeRankedStats(response)
  },

  getUserGames: async (filters = {}) => {
    const response = await gameAPI.get('/games', { params: filters })
    return unwrapApiEnvelope(response)
  },

  getAllUserGames: async (filters = {}) => {
    const pageSize = Math.min(Number(filters.pageSize ?? 100), 100)
    const maxPages = Math.max(1, Number(filters.maxPages ?? 20))
    const cacheKey = JSON.stringify({ ...filters, pageSize, maxPages })
    const cached = userGamesCache.get(cacheKey)
    if (cached && Date.now() - cached.cachedAt < USER_GAMES_CACHE_TTL_MS) {
      return cached.data
    }

    const baseFilters = { ...filters, pageSize }
    const firstPageNumber = Math.max(1, Number(baseFilters.page ?? 1))

    const firstResponse = await gameAPI.get('/games', {
      params: { ...baseFilters, page: firstPageNumber },
    })
    const firstData = unwrapApiEnvelope(firstResponse)
    const firstItems = Array.isArray(firstData?.items) ? firstData.items : []
    const firstGames = Array.isArray(firstData?.games) ? firstData.games : []
    const total = Number(firstData?.total ?? firstItems.length)

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const effectivePages = Math.min(totalPages, maxPages)

    const nextPageRequests = []
    for (let page = firstPageNumber + 1; page <= effectivePages; page += 1) {
      nextPageRequests.push(gameAPI.get('/games', { params: { ...baseFilters, page } }))
    }

    const nextResponses = await Promise.all(nextPageRequests)
    const nextData = nextResponses.map((response) => unwrapApiEnvelope(response))

    const items = [
      ...firstItems,
      ...nextData.flatMap((entry) => (Array.isArray(entry?.items) ? entry.items : [])),
    ]
    const games = [
      ...firstGames,
      ...nextData.flatMap((entry) => (Array.isArray(entry?.games) ? entry.games : [])),
    ]

    const data = {
      items,
      games,
      total,
      page: firstPageNumber,
      pageSize,
    }

    userGamesCache.set(cacheKey, { data, cachedAt: Date.now() })
    return data
  },

  getUserModeStats: async (mode) => {
    const response = await gameAPI.get('/users/stats/by-mode', {
      params: mode ? { mode } : {},
    })
    return unwrapApiEnvelope(response)
  },

  makeMove: (matchId, move) => gameAPI.post(`/game/${matchId}/move`, { move }),

  resignGame: (matchId) => gameAPI.post(`/game/${matchId}/resign`),

  offerDraw: (matchId) => gameAPI.post(`/game/${matchId}/draw/offer`),

  respondToDrawOffer: (matchId, accept) =>
    gameAPI.post(`/game/${matchId}/draw/respond`, { accept }),

  // Room APIs
  createRoom: async (settings) => {
    const response = await gameAPI.post('/rooms', settings)
    clearPublicRoomsCache()
    return response
  },

  joinRoom: async (roomCode) => {
    const response = await gameAPI.post(`/rooms/${roomCode}/join`)
    clearPublicRoomsCache()
    return response
  },

  leaveRoom: async (roomCode) => {
    const response = await gameAPI.post(`/rooms/${roomCode}/leave`)
    clearPublicRoomsCache()
    return response
  },

  getRoom: (roomCode) => gameAPI.get(`/rooms/${roomCode}`),

  getPublicRooms: async (filters = {}) => {
    const status = typeof filters.status === 'string' ? filters.status : 'waiting'
    const limit = Math.min(Math.max(Number(filters.limit || 30), 1), 100)

    const response = await gameAPI.get('/rooms', {
      params: {
        visibility: 'public',
        status,
        limit,
      },
    })
    const data = unwrapApiEnvelope(response)
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.rooms) ? data.rooms : []
    const normalized = {
      items,
      total: Number(data?.total ?? items.length),
    }
    return normalized
  },

  startRoomGame: async (roomCode) => {
    const response = await gameAPI.post(`/rooms/${roomCode}/start`)
    clearPublicRoomsCache()
    return response
  },

  saveGame: (gameId, data) => gameAPI.post(`/games/${gameId}/save`, data),

  getGameById: async (gameId) => {
    const response = await gameAPI.get(`/games/${gameId}`)
    return unwrapApiEnvelope(response)
  },

  // Tournament APIs
  getTournaments: (filters = {}) => gameAPI.get('/tournaments', { params: filters }),

  getTournament: (tournamentId) => gameAPI.get(`/tournaments/${tournamentId}`),

  joinTournament: (tournamentId) => gameAPI.post(`/tournaments/${tournamentId}/join`),

  withdrawTournament: (tournamentId) => gameAPI.post(`/tournaments/${tournamentId}/withdraw`),

  startTournament: (tournamentId) => gameAPI.post(`/tournaments/${tournamentId}/start`),

  cancelTournament: (tournamentId) => gameAPI.post(`/tournaments/${tournamentId}/cancel`),

  recordTournamentMatchResult: (tournamentId, matchId, data) =>
    gameAPI.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, data),

  startTournamentMatch: (tournamentId, matchId) =>
    gameAPI.post(`/tournaments/${tournamentId}/matches/${matchId}/start`),

  resignTournamentMatch: (tournamentId, matchId) =>
    gameAPI.post(`/tournaments/${tournamentId}/matches/${matchId}/resign`),

  approveTournamentParticipant: (tournamentId, userId) =>
    gameAPI.post(`/tournaments/${tournamentId}/participants/${userId}/approve`),

  rejectTournamentParticipant: (tournamentId, userId) =>
    gameAPI.post(`/tournaments/${tournamentId}/participants/${userId}/reject`),

  setTournamentSeeding: (tournamentId, data) =>
    gameAPI.post(`/tournaments/${tournamentId}/seeding`, data),

  openTournamentRound: (tournamentId, data = {}) =>
    gameAPI.post(`/tournaments/${tournamentId}/rounds/open`, data),

  checkInTournamentMatch: (tournamentId, matchId) =>
    gameAPI.post(`/tournaments/${tournamentId}/matches/${matchId}/check-in`),

  createTournament: (data) => gameAPI.post('/tournaments', data),
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
    const difficultyMap = {
      1: 'easy',
      2: 'normal',
      3: 'hard',
      4: 'super_hard',
    }

    const difficultyLabelMap = {
      easy: 'Dễ',
      normal: 'Bình thường',
      hard: 'Khó',
      super_hard: 'Siêu cấp khó',
      beginner: 'Dễ',
      intermediate: 'Bình thường',
      advanced: 'Khó',
      expert: 'Siêu cấp khó',
    }

    const difficultyRatingMap = {
      easy: BOT_THINKING_PROFILES.easy.rating,
      normal: BOT_THINKING_PROFILES.normal.rating,
      hard: BOT_THINKING_PROFILES.hard.rating,
      super_hard: BOT_THINKING_PROFILES.super_hard.rating,
      beginner: BOT_THINKING_PROFILES.easy.rating,
      intermediate: BOT_THINKING_PROFILES.normal.rating,
      advanced: BOT_THINKING_PROFILES.hard.rating,
      expert: BOT_THINKING_PROFILES.super_hard.rating,
    }

    const requestedDifficulty = difficultyMap[level] || 'normal'
    const requestedProfile =
      BOT_THINKING_PROFILES[requestedDifficulty] || BOT_THINKING_PROFILES.normal

    const response = await gameAPI.post('/bot/games', {
      difficulty: requestedDifficulty,
      preferredColor: 'white',
      maxThinkSeconds: Math.max(1, Math.ceil(requestedProfile.timeLimitMs / 1000)),
    })

    const data = response?.data ?? response
    const effectiveDifficulty = data?.difficulty || requestedDifficulty
    const effectiveProfile =
      BOT_THINKING_PROFILES[effectiveDifficulty] || requestedProfile || BOT_THINKING_PROFILES.normal

    return {
      ...data,
      initialFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'White',
      botPlayer: data?.botPlayer || {
        username: `Bot ${difficultyLabelMap[effectiveDifficulty] || 'Medium'}`,
        rating: difficultyRatingMap[effectiveDifficulty] || 1100,
        isBot: true,
      },
      config: {
        ...(data?.config || {}),
        difficulty: difficultyLabelMap[effectiveDifficulty] || 'Bình thường',
        difficultyCode: effectiveDifficulty,
        depth: data?.config?.depth ?? effectiveProfile.depth,
        timeLimitMs: data?.config?.timeLimitMs ?? effectiveProfile.timeLimitMs,
        requestTimeoutMs:
          data?.config?.requestTimeoutMs ?? effectiveProfile.requestTimeoutMs,
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
  submitPlayerMove: (gameId, move) => gameAPI.post(`/games/${gameId}/moves`, { move }),

  getBotMove: async (sessionId, fen, options = {}) => {
    const timeoutMs = Math.max(Number(options?.timeoutMs || 0), 10000)
    try {
      const response = await gameAPI.post('/bot/move', { sessionId, fen }, { timeout: timeoutMs })
      return response?.data ?? response
    } catch (error) {
      if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
        const timeoutError = new Error('Bot đang tính sâu hơn dự kiến, vui lòng thử lại.')
        timeoutError.statusCode = 504
        throw timeoutError
      }
      throw error
    }
  },

  getTacticalHint: async (pgn, detailLevel = 'detailed', context = null) => {
    const response = await gameAPI.post('/bot/tactical-hint', {
      pgn,
      detailLevel,
      ...(context && typeof context === 'object' ? context : {}),
    })
    return response?.data ?? response
  },

  pauseBotGame: (gameId) => gameAPI.patch(`/games/${gameId}/state`, { action: 'pause' }),

  resumeBotGame: (gameId) => gameAPI.patch(`/games/${gameId}/state`, { action: 'resume' }),

  /**
   * UC6: Save Game to History — SM: Finished → Saved
   */
  saveBotGame: (gameId, data) => gameAPI.post(`/games/${gameId}/save`, data),
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
  getGame: async (gameId, analysisParams = null) => {
    const params = analysisParams
      ? {
          analyzeFen: analysisParams.fen,
          userMove: analysisParams.userMove,
          score: analysisParams.score,
          refreshAi: analysisParams.refreshAi ? 1 : undefined,
          playerColor: analysisParams.playerColor,
        }
      : undefined
    const response = await gameAPI.get(`/games/${gameId}`, { params })
    return unwrapApiEnvelope(response)
  },

  /**
   * GET /games?mode=bot|ranked|room|tournament&result=win|lose|draw
   * Also accepts legacy UI values and normalizes them before sending.
   */
  getGameHistory: async (filters = {}) => {
    const modeMap = {
      HumanVsBot: 'bot',
      HumanVsHuman: 'ranked',
      bot: 'bot',
      ranked: 'ranked',
      room: 'room',
      tournament: 'tournament',
    }

    const resultMap = {
      WhiteWin: 'win',
      BlackWin: 'lose',
      Draw: 'draw',
      win: 'win',
      lose: 'lose',
      draw: 'draw',
    }

    const params = { ...filters }
    if (params.mode) params.mode = modeMap[params.mode] || params.mode
    if (params.result) params.result = resultMap[params.result] || params.result

    const response = await gameAPI.get('/games', { params })
    return unwrapApiEnvelope(response)
  },
}
