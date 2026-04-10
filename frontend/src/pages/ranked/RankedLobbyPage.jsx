import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Swords,
  Trophy,
  Clock,
  Users,
  X,
  ChevronRight,
  Shield,
  TrendingUp,
  History,
  BarChart3,
  Search,
  Wifi,
  WifiOff,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react'
import { Button, Avatar, Loader } from '@components/common'
import { MainLayout } from '@components/layout'
import { useRankedSocket } from '@hooks/useWebSocket'
import { useAuthStore } from '@store'
import gameService from '@services/gameService'
import { RANKS, INACTIVITY_TIMEOUT } from '@utils/constants'
import { formatEloDelta, eloDeltaColor, formatRelativeTime } from '@utils/formatters'
import { THEME } from '@/styles/theme'

// ─────────────── Helper: get rank info by rating ───────────────
const getRankInfo = (rating) => {
  const rank = RANKS.find((r) => rating >= r.min && rating < r.max)
  return rank || RANKS[0]
}

// ─────────────── Helper: format search timer ───────────────
const formatSearchTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─────────────── Matchmaking Status Enum ───────────────
const QUEUE_STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  FOUND: 'found',
  CONNECTING: 'connecting',
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: SearchingOverlay
// ═══════════════════════════════════════════════════════════
const SearchingOverlay = ({ status, searchTime, queueCount, onCancel, matchData }) => {
  const statusConfig = {
    [QUEUE_STATUS.SEARCHING]: {
      title: 'Searching for opponent...',
      subtitle: `Finding a player within ±100 Elo of your rating`,
      icon: <Search className="w-8 h-8 text-green-400 animate-pulse" />,
      showTimer: true,
      showCancel: true,
    },
    [QUEUE_STATUS.FOUND]: {
      title: 'Opponent Found!',
      subtitle: matchData
        ? `${matchData.opponent?.username} (${matchData.opponent?.rating})`
        : 'Preparing match...',
      icon: <Swords className="w-8 h-8 text-yellow-400 animate-bounce" />,
      showTimer: false,
      showCancel: false,
    },
    [QUEUE_STATUS.CONNECTING]: {
      title: 'Connecting to game...',
      subtitle: 'Setting up the board',
      icon: <Wifi className="w-8 h-8 text-blue-400 animate-pulse" />,
      showTimer: false,
      showCancel: false,
    },
  }

  const config = statusConfig[status]
  if (!config) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-8 max-w-md w-full mx-4 text-center ${THEME.shadow.lg} animate-slideUp`}
      >
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            {config.icon}
          </div>
        </div>

        {/* Status Title */}
        <h2 className={`text-2xl font-bold ${THEME.text.primary} mb-2`}>{config.title}</h2>
        <p className={`${THEME.text.secondary} mb-6`}>{config.subtitle}</p>

        {/* Timer */}
        {config.showTimer && (
          <div className="mb-6">
            <div className="text-4xl font-mono font-bold text-green-600 mb-2">
              {formatSearchTime(searchTime)}
            </div>
            <p className={`text-sm ${THEME.text.muted}`}>Search time</p>
          </div>
        )}

        {/* Queue Stats */}
        {config.showTimer && queueCount > 0 && (
          <div
            className={`flex items-center justify-center gap-2 mb-6 text-sm ${THEME.text.secondary}`}
          >
            <Users className="w-4 h-4" />
            <span>~{queueCount} players in queue</span>
          </div>
        )}

        {/* Pulsating dots animation */}
        {status === QUEUE_STATUS.SEARCHING && (
          <div className="flex justify-center gap-1.5 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Cancel Button */}
        {config.showCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            <X className="w-4 h-4" />
            Cancel Search
          </Button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: RecentGameCard
// ═══════════════════════════════════════════════════════════
const RecentGameCard = ({ game }) => {
  const resultStyles = {
    win: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: 'WIN',
    },
    lose: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'LOSS' },
    draw: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'DRAW',
    },
  }

  const style = resultStyles[game.result] || resultStyles.draw
  const duration =
    Math.floor(game.duration / 60) + ':' + String(game.duration % 60).padStart(2, '0')

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg ${style.bg} border ${style.border} transition-all hover:scale-[1.01]`}
    >
      {/* Result Badge */}
      <div className={`w-14 text-center font-bold text-xs py-1 rounded ${style.text} ${style.bg}`}>
        {style.label}
      </div>

      {/* Opponent Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={game.opponent.avatarUrl} name={game.opponent.username} size="sm" />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${THEME.text.primary} truncate`}>
            {game.opponent.username}
          </p>
          <p className={`text-xs ${THEME.text.muted}`}>{game.opponent.rating} Elo</p>
        </div>
      </div>

      {/* Rating Change */}
      <div className={`text-sm font-bold ${eloDeltaColor(game.ratingChange)}`}>
        {formatEloDelta(game.ratingChange)}
      </div>

      {/* Duration & Time */}
      <div className="text-right hidden sm:block">
        <p className={`text-xs ${THEME.text.muted}`}>{duration}</p>
        <p className={`text-xs ${THEME.text.muted} opacity-75`}>
          {formatRelativeTime(game.playedAt)}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN: RankedLobbyPage
// ═══════════════════════════════════════════════════════════
const RankedLobbyPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isDemo = location.pathname.startsWith('/demo')

  // ──── Auth/User State ────
  const { isAuthenticated } = useAuthStore()
  const storeUser = useAuthStore((s) => s.user)
  const user = useMemo(
    () =>
      storeUser
        ? {
            id: storeUser.id,
            username: storeUser.username || 'Người chơi',
            rating: storeUser.rating || 1200,
            avatarUrl: storeUser.avatarUrl || null,
            gamesPlayed: storeUser.gamesPlayed ?? 0,
            wins: storeUser.wins ?? 0,
            losses: storeUser.losses ?? 0,
            draws: storeUser.draws ?? 0,
          }
        : {
            id: '',
            username: 'Người chơi',
            rating: 1200,
            avatarUrl: null,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
          },
    [storeUser]
  )

  // ──── Queue & Match State ────
  const [queueStatus, setQueueStatus] = useState(QUEUE_STATUS.IDLE)
  const [searchTime, setSearchTime] = useState(0)
  const [queueCount, setQueueCount] = useState(0)
  const [matchData, setMatchData] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading] = useState(true)
  const searchTimerRef = useRef(null)
  const matchFoundRef = useRef(false) // guard against double-navigation

  // ──── WebSocket Hook ────
  const { isConnected, joinQueue, leaveQueue, onMatchFound, onQueueUpdate } = useRankedSocket()

  // ──── Load Recent Games ────
  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        const data = await gameService.getRankedHistory(1, 5)
        setRecentGames(data.matches || [])
      } catch {
        setRecentGames([])
      } finally {
        setLoading(false)
      }
    }
    fetchRecentGames()
  }, [])

  // ──── Listen for match found (real WebSocket) ────
  useEffect(() => {
    const handleMatchFound = (data) => {
      // Guard: prevent double-navigation from both WS + mock
      if (matchFoundRef.current) return
      matchFoundRef.current = true

      // data: { matchId, opponent, color }
      setQueueStatus(QUEUE_STATUS.FOUND)
      setMatchData(data)

      // After 1.5s → connecting state
      setTimeout(() => {
        setQueueStatus(QUEUE_STATUS.CONNECTING)
      }, 1500)

      // After 3s → redirect to game
      setTimeout(() => {
        navigate(`/ranked/game/${data.matchId}`)
      }, 3000)
    }

    const handleQueueUpdate = (data) => {
      // data: { playersInQueue }
      if (data?.playersInQueue) {
        setQueueCount(data.playersInQueue)
      }
    }

    onMatchFound(handleMatchFound)
    onQueueUpdate(handleQueueUpdate)
  }, [onMatchFound, onQueueUpdate, navigate])

  // ──── Search Timer ────
  useEffect(() => {
    if (queueStatus === QUEUE_STATUS.SEARCHING) {
      setSearchTime(0)
      searchTimerRef.current = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current)
        searchTimerRef.current = null
      }
    }

    return () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current)
      }
    }
  }, [queueStatus])

  // ──── Handlers ────
  const handleFindMatch = useCallback(() => {
    matchFoundRef.current = false // reset guard for new search
    setQueueStatus(QUEUE_STATUS.SEARCHING)
    setMatchData(null)
    setQueueCount(Math.floor(Math.random() * 60) + 20)

    // Emit WebSocket event
    joinQueue(user.id, user.rating)
  }, [joinQueue, user.id, user.rating])

  const handleCancelSearch = useCallback(() => {
    setQueueStatus(QUEUE_STATUS.IDLE)
    setSearchTime(0)
    setMatchData(null)
    setQueueCount(0)

    leaveQueue()
  }, [leaveQueue])

  // ──── Derived State ────
  const rankInfo = getRankInfo(user.rating)
  const isSearching = queueStatus !== QUEUE_STATUS.IDLE

  return (
    <MainLayout hideFooter>
      <div className="max-w-6xl mx-auto">
        {/* ============ PAGE HEADER ============ */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${THEME.text.primary} flex items-center gap-3`}>
              <Trophy className="w-8 h-8 text-yellow-400" />
              Ranked Match
            </h1>
            <p className={`${THEME.text.secondary} mt-1`}>
              Compete against players of similar skill and climb the leaderboard
            </p>
          </div>

          {/* Quick Nav */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to={isDemo ? '/demo/ranked/history' : '/ranked/history'}
              className={`flex items-center gap-2 text-sm ${THEME.text.secondary} hover:${THEME.text.primary} transition-colors px-3 py-2 rounded-lg hover:bg-gray-100`}
            >
              <History className="w-4 h-4" />
              History
            </Link>
            <Link
              to={isDemo ? '/demo/ranked/stats' : '/ranked/stats'}
              className={`flex items-center gap-2 text-sm ${THEME.text.secondary} hover:${THEME.text.primary} transition-colors px-3 py-2 rounded-lg hover:bg-gray-100`}
            >
              <BarChart3 className="w-4 h-4" />
              Stats
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============ LEFT COLUMN: Main Action Area ============ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ──── Player Rating Card ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-6 ${THEME.shadow.DEFAULT}`}
            >
              <div className="flex items-center gap-5">
                <Avatar src={user.avatarUrl} name={user.username} size="xl" />
                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${THEME.text.primary}`}>{user.username}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-400">{user.rating}</span>
                    </div>

                    {/* Rank Badge */}
                    <div
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor: rankInfo.color + '20',
                        color: rankInfo.color,
                        border: `1px solid ${rankInfo.color}40`,
                      }}
                    >
                      {rankInfo.name}
                    </div>
                  </div>

                  {/* Rating Progress Bar */}
                  <div className="mt-3">
                    <div className={`flex justify-between text-xs ${THEME.text.muted} mb-1`}>
                      <span>{rankInfo.min}</span>
                      <span>{rankInfo.max === Infinity ? '∞' : rankInfo.max}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            rankInfo.max === Infinity
                              ? 100
                              : ((user.rating - rankInfo.min) / (rankInfo.max - rankInfo.min)) * 100
                          }%`,
                          backgroundColor: rankInfo.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ──── Find Match Button ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-8 text-center ${THEME.shadow.DEFAULT}`}
            >
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <Swords className="w-10 h-10 text-green-600" />
                </div>
                <h3 className={`text-xl font-bold ${THEME.text.primary} mb-2`}>Ready to Play?</h3>
                <p className={`${THEME.text.secondary} text-sm`}>
                  10 minutes per player • Rated • ±100 Elo matching
                </p>
              </div>

              <button
                onClick={handleFindMatch}
                disabled={isSearching}
                className="
                  relative w-full max-w-xs mx-auto
                  px-10 py-4 text-lg font-bold text-white
                  bg-[#81b64c] hover:bg-[#739e44] 
                  rounded-xl shadow-lg shadow-green-500/20
                  hover:shadow-xl hover:shadow-green-500/30
                  active:scale-95
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-3
                "
              >
                <Swords className="w-6 h-6" />
                Find Match
              </button>

              {/* Connection Status */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {/* ──── Recent Ranked Games ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-6 ${THEME.shadow.DEFAULT}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${THEME.text.primary} flex items-center gap-2`}>
                  <Clock className={`w-5 h-5 ${THEME.text.secondary}`} />
                  Recent Games
                </h3>
                <Link
                  to={isDemo ? '/demo/ranked/history' : '/ranked/history'}
                  className="text-sm text-green-600 hover:text-green-500 flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader size="md" text="Loading games..." />
                </div>
              ) : recentGames.length > 0 ? (
                <div className="space-y-2">
                  {recentGames.map((game) => (
                    <RecentGameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${THEME.text.muted}`}>
                  <Swords className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No ranked games yet.</p>
                  <p className="text-xs mt-1">Find a match to get started!</p>
                </div>
              )}
            </div>
          </div>

          {/* ============ RIGHT COLUMN: Info & Rules ============ */}
          <div className="space-y-6">
            {/* ──── Quick Stats ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 ${THEME.shadow.DEFAULT}`}
            >
              <h3
                className={`text-sm font-semibold ${THEME.text.secondary} uppercase tracking-wider mb-4`}
              >
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${THEME.text.primary}`}>{user.rating}</p>
                  <p className={`text-xs ${THEME.text.muted} mt-1`}>ELO Rating</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: rankInfo.color }}>
                    {rankInfo.name.split(' ')[0]}
                  </p>
                  <p className={`text-xs ${THEME.text.muted} mt-1`}>Rank</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{user.wins ?? 0}</p>
                  <p className={`text-xs ${THEME.text.muted} mt-1`}>Thắng</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{user.losses ?? 0}</p>
                  <p className={`text-xs ${THEME.text.muted} mt-1`}>Thua</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center col-span-2">
                  <div className="flex justify-around">
                    <div>
                      <p className={`text-xl font-bold ${THEME.text.primary}`}>
                        {user.gamesPlayed ?? 0}
                      </p>
                      <p className={`text-xs ${THEME.text.muted}`}>Tổng ván</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-500">{user.draws ?? 0}</p>
                      <p className={`text-xs ${THEME.text.muted}`}>Hòa</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-600">
                        {user.gamesPlayed > 0
                          ? Math.round((user.wins / user.gamesPlayed) * 100)
                          : 0}
                        %
                      </p>
                      <p className={`text-xs ${THEME.text.muted}`}>Tỉ lệ thắng</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ──── Ranked Rules ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 ${THEME.shadow.DEFAULT}`}
            >
              <h3
                className={`text-sm font-semibold ${THEME.text.secondary} uppercase tracking-wider mb-4 flex items-center gap-2`}
              >
                <Info className="w-4 h-4" />
                Ranked Rules
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    icon: <Clock className="w-4 h-4 text-blue-400" />,
                    text: '10 minutes per player',
                  },
                  {
                    icon: <Users className="w-4 h-4 text-green-400" />,
                    text: 'Matched within ±100 Elo',
                  },
                  {
                    icon: <TrendingUp className="w-4 h-4 text-yellow-400" />,
                    text: 'Elo updated after each game',
                  },
                  {
                    icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
                    text: `AFK > ${INACTIVITY_TIMEOUT}s = auto lose`,
                  },
                  {
                    icon: <WifiOff className="w-4 h-4 text-red-400" />,
                    text: 'Disconnect > 30s = auto lose',
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-purple-400" />,
                    text: 'Fair play monitored',
                  },
                ].map((rule, i) => (
                  <li key={i} className={`flex items-start gap-3 text-sm ${THEME.text.secondary}`}>
                    <span className="mt-0.5 flex-shrink-0">{rule.icon}</span>
                    <span>{rule.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ──── Elo Formula ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 ${THEME.shadow.DEFAULT}`}
            >
              <h3
                className={`text-sm font-semibold ${THEME.text.secondary} uppercase tracking-wider mb-4 flex items-center gap-2`}
              >
                <Zap className="w-4 h-4" />
                Elo System
              </h3>
              <div className={`space-y-3 text-sm ${THEME.text.secondary}`}>
                <p>Rating changes are calculated using the Elo formula:</p>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs text-center text-green-600">
                  ΔR = K × (S - E), K = 32
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-green-400 font-semibold">Win</span> against higher rated →
                    more points
                  </p>
                  <p>
                    <span className="text-red-400 font-semibold">Lose</span> against lower rated →
                    more penalty
                  </p>
                  <p>
                    <span className="text-yellow-400 font-semibold">Draw</span> → small adjustment
                    toward expected
                  </p>
                </div>
              </div>
            </div>

            {/* ──── Ranking Tiers ──── */}
            <div
              className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 ${THEME.shadow.DEFAULT}`}
            >
              <h3
                className={`text-sm font-semibold ${THEME.text.secondary} uppercase tracking-wider mb-4`}
              >
                Ranking Tiers
              </h3>
              <div className="space-y-2">
                {RANKS.map((rank) => (
                  <div
                    key={rank.name}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      user.rating >= rank.min && user.rating < rank.max ? 'bg-gray-100' : ''
                    }`}
                    style={
                      user.rating >= rank.min && user.rating < rank.max
                        ? { boxShadow: `inset 0 0 0 1px ${rank.color}80` }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: rank.color }}
                      />
                      <span
                        className={`font-medium ${
                          user.rating >= rank.min && user.rating < rank.max
                            ? THEME.text.primary
                            : THEME.text.muted
                        }`}
                      >
                        {rank.name}
                      </span>
                    </div>
                    <span className={`text-xs ${THEME.text.muted}`}>
                      {rank.min} - {rank.max === Infinity ? '∞' : rank.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ SEARCHING OVERLAY ============ */}
      {isSearching && (
        <SearchingOverlay
          status={queueStatus}
          searchTime={searchTime}
          queueCount={queueCount}
          onCancel={handleCancelSearch}
          matchData={matchData}
        />
      )}
    </MainLayout>
  )
}

export default RankedLobbyPage
