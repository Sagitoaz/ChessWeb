import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChessBoard } from '@components/game'
import {
  Flag,
  Handshake,
  AlertTriangle,
  Crown,
  ArrowLeft,
  Send,
  Trophy,
  List,
  Swords,
  Volume2,
  VolumeX,
  Eye,
} from 'lucide-react'
import { Button, Avatar } from '@components/common'
import { MainLayout } from '@components/layout'
import { useNotification } from '@/components/common/Notification'
import { useGameSocket } from '@hooks/useWebSocket'
import { useAuthStore } from '@store'
import { ChessGame } from '@utils/chessLogic'
import { RANKS } from '@utils/constants'
import { formatEloDelta, eloDeltaColor } from '@utils/formatters'
import { buildMovePairs, getMoveLabel } from '@/utils/moveNotation'
import { getUserDisplayName } from '@/utils/userDisplay'
import gameService from '@services/gameService'

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────
const GAME_PHASE = {
  LOADING: 'loading',
  PLAYING: 'playing',
  ENDED: 'ended',
}

const INITIAL_TIME_MS = 600_000 // 10 minutes per side
const CLOCK_TICK_MS = 100

/** Starting piece counts (per side) */
const STARTING_MATERIAL = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 }

/** Unicode chess symbols for captured-pieces display */
const PIECE_UNICODE = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}

/** Display order for captured pieces (high value first) */
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p']

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const getRankInfo = (rating) => RANKS.find((r) => rating >= r.min && rating < r.max) || RANKS[0]

/** Format milliseconds → "M:SS" or "S.t" when < 10 s */
const fmtClock = (ms) => {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (ms < 10_000) {
    const tenths = Math.floor((ms % 1000) / 100)
    return `${sec}.${tenths}`
  }
  return `${min}:${String(sec).padStart(2, '0')}`
}

/** Elo formula mock: K × (S – E), K = 32 */
const calcMockRatingDelta = (result, pRating, oRating) => {
  const E = 1 / (1 + Math.pow(10, (oRating - pRating) / 400))
  const S = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  return Math.round(32 * (S - E))
}

const toRankedApiResult = (playerColor, localResult) => {
  if (localResult === 'draw') return 'Draw'
  if (localResult === 'win') return playerColor === 'white' ? 'WhiteWin' : 'BlackWin'
  return playerColor === 'white' ? 'BlackWin' : 'WhiteWin'
}

const toLocalResultFromServer = (playerColor, serverResult) => {
  const normalized = typeof serverResult === 'string' ? serverResult.toLowerCase() : ''
  if (normalized === 'draw' || normalized === '1/2-1/2') return 'draw'
  if (normalized === 'whitewin' || normalized === '1-0' || normalized === 'white_win') {
    return playerColor === 'white' ? 'win' : 'lose'
  }
  if (normalized === 'blackwin' || normalized === '0-1' || normalized === 'black_win') {
    return playerColor === 'black' ? 'win' : 'lose'
  }
  return 'draw'
}

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const objectIdMatch = trimmed.match(/^ObjectId\("([a-fA-F0-9]{24})"\)$/)
    return objectIdMatch?.[1] || trimmed
  }
  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid
    if (typeof value.id === 'string') return value.id
    if (typeof value._id === 'string') return value._id
    if (typeof value.userId === 'string') return value.userId
    if (typeof value.sub === 'string') return value.sub
    if (typeof value.toString === 'function') {
      const asString = String(value.toString())
      const objectIdMatch = asString.match(/^ObjectId\("([a-fA-F0-9]{24})"\)$/)
      if (objectIdMatch?.[1]) return objectIdMatch[1]
      if (asString && asString !== '[object Object]') return asString
    }
  }
  return String(value)
}

// ─────────────────────────────────────────────────────
// FALLBACK DATA
// ─────────────────────────────────────────────────────
const DEFAULT_PLAYER = {
  id: 'player-1',
  username: 'Player',
  rating: 1523,
  avatarUrl: null,
}

const DEFAULT_OPPONENT = {
  id: 'opp-1',
  username: 'Opponent',
  rating: 1498,
  avatarUrl: null,
}

// ═════════════════════════════════════════════════════
// SUB-CMP: CapturedPieces
// Shows pieces a player has captured (opponent's lost army)
// ═════════════════════════════════════════════════════
const CapturedPieces = ({ pieces, color, advantage }) => {
  if (!pieces || pieces.length === 0) return <div className="h-5" />
  return (
    <div className="flex items-center gap-0.5 h-5">
      {pieces.map((p, i) => (
        <span key={i} className="text-sm leading-none opacity-70">
          {PIECE_UNICODE[color][p]}
        </span>
      ))}
      {advantage > 0 && <span className="text-xs font-bold text-gray-500 ml-1">+{advantage}</span>}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: PlayerBar
// Compact bar: avatar · name · rating · captured · clock
// ═════════════════════════════════════════════════════
const PlayerBar = ({
  player,
  timeMs,
  isActive,
  capturedPieces,
  capturedColor,
  materialAdvantage,
}) => {
  const rank = getRankInfo(player.rating)
  const low = timeMs < 30_000
  const critical = timeMs < 10_000

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ${
        isActive ? 'bg-green-50 border border-green-400' : 'bg-white border border-gray-200'
      }`}
    >
      {/* Left ─ player info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar src={player.avatarUrl} alt={player.username} size="sm" />
          {isActive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm truncate">{player.username}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{
                color: rank.color,
                backgroundColor: `${rank.color}20`,
              }}
            >
              {player.rating}
            </span>
          </div>
          <CapturedPieces
            pieces={capturedPieces}
            color={capturedColor}
            advantage={materialAdvantage}
          />
        </div>
      </div>

      {/* Right ─ clock */}
      <div
        className={`font-mono text-2xl font-bold px-3 py-1 rounded min-w-[90px] text-right tabular-nums transition-colors ${
          critical && isActive
            ? 'bg-red-100 text-red-600 animate-pulse'
            : low && isActive
              ? 'bg-yellow-100 text-yellow-700'
              : isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-500'
        }`}
      >
        {fmtClock(timeMs)}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: EndGameModal
// Full-screen overlay showing result + rating change
// ═════════════════════════════════════════════════════
const EndGameModal = ({
  isOpen,
  result,
  reason,
  ratingChange,
  newRating,
  player,
  opponent,
  onBackToLobby,
  onViewHistory,
  playerColorLabel = 'Trắng',
}) => {
  if (!isOpen) return null

  // Local 2P: "win" = player (white) thắng, "lose" = opponent (black) thắng
  const winnerName =
    result === 'win' ? player.username : result === 'lose' ? opponent.username : null

  const cfg = {
    win: {
      title: `🏆 ${winnerName} thắng!`,
      icon: <Crown className="w-12 h-12 text-yellow-400" />,
      bg: 'from-yellow-900/40 to-green-900/30',
      border: 'border-yellow-600/50',
    },
    lose: {
      title: `🏆 ${winnerName} thắng!`,
      icon: <Crown className="w-12 h-12 text-yellow-400" />,
      bg: 'from-yellow-900/40 to-green-900/30',
      border: 'border-yellow-600/50',
    },
    draw: {
      title: 'Hòa cờ',
      icon: <Handshake className="w-12 h-12 text-blue-400" />,
      bg: 'from-blue-900/30 to-gray-900/30',
      border: 'border-blue-600/50',
    },
  }[result] || {
    title: 'Kết thúc',
    icon: <Swords className="w-12 h-12 text-gray-400" />,
    bg: 'from-gray-900 to-gray-900',
    border: 'border-gray-600',
  }

  const reasonLabel = {
    checkmate: 'bằng chiếu hết',
    resignation: 'đối thủ đầu hàng',
    timeout: 'hết giờ',
    stalemate: 'pat (hòa)',
    draw_agreement: 'đồng ý hòa',
    insufficient_material: 'thiếu quân (hòa)',
    threefold_repetition: 'lặp thế (hòa)',
    fifty_move: 'luật 50 nước (hòa)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl border border-gray-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">{cfg.icon}</div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-1">{cfg.title}</h2>
        <p className="text-gray-500 text-sm mb-6">{reasonLabel[reason] || reason}</p>

        {/* Players */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <Avatar src={player.avatarUrl} alt={player.username} size="sm" />
            <p className="text-xs text-gray-600 mt-1 truncate max-w-[80px]">{player.username}</p>
          </div>
          <span className="text-gray-400 font-bold text-lg">vs</span>
          <div className="text-center">
            <Avatar src={opponent.avatarUrl} alt={opponent.username} size="sm" />
            <p className="text-xs text-gray-600 mt-1 truncate max-w-[80px]">{opponent.username}</p>
          </div>
        </div>

        {/* Rating change */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Thay đổi ELO (Bạn - {playerColorLabel})</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-gray-500 text-lg">{player.rating}</span>
            <span className="text-gray-400">→</span>
            <span className={`text-2xl font-bold ${eloDeltaColor(ratingChange)}`}>{newRating}</span>
            <span className={`text-sm font-semibold ${eloDeltaColor(ratingChange)}`}>
              ({formatEloDelta(ratingChange)})
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            onClick={onBackToLobby}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Swords className="w-4 h-4" />
            Về Lobby
          </Button>
          <Button
            variant="ghost"
            onClick={onViewHistory}
            className="w-full gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            Lịch sử trận
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: DrawOfferBanner
// ═════════════════════════════════════════════════════
const DrawOfferBanner = ({ from, onAccept, onDecline }) => (
  <div className="mx-3 my-2 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
    <div className="flex items-center gap-3">
      <Handshake className="w-5 h-5 text-yellow-600 flex-shrink-0" />
      <p className="flex-1 text-sm text-yellow-800 font-medium">{from} đề nghị hòa</p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
        >
          Chấp nhận
        </button>
        <button
          onClick={onDecline}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors"
        >
          Từ chối
        </button>
      </div>
    </div>
  </div>
)

// ═════════════════════════════════════════════════════
// SUB-CMP: MoveList  —  compact inline move history
// ═════════════════════════════════════════════════════
const MoveListPanel = ({ moves }) => {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm rounded-lg border border-dashed border-gray-200 bg-gray-50">
        Chưa có nước đi nào
      </div>
    )
  }

  const pairs = buildMovePairs(moves).map((pair) => ({
    n: pair.fullMove,
    w: pair.white,
    b: pair.black,
    wi: pair.whiteIndex,
    bi: pair.blackIndex,
  }))

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="space-y-1">
        {pairs.map((p) => (
          <div
            key={p.n}
            className="grid grid-cols-[26px_1fr_1fr] gap-1 text-sm items-center rounded-md hover:bg-gray-50 px-1.5 py-1 transition-colors"
          >
            <span className="text-gray-500 text-xs font-mono text-right">{p.n}.</span>
            <span
              className={`font-mono px-2 py-1 rounded ${
                p.wi === moves.length - 1
                  ? 'bg-yellow-100 text-yellow-800 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {getMoveLabel(p.w)}
            </span>
            {p.b && (
              <span
                className={`font-mono px-2 py-1 rounded ${
                  p.bi === moves.length - 1
                    ? 'bg-yellow-100 text-yellow-800 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {getMoveLabel(p.b)}
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: InlineChat
// ═════════════════════════════════════════════════════
const InlineChat = ({ messages, onSend, disabled }) => {
  const [text, setText] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages.length])

  const handleSubmit = (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
  }

  return (
    <div className="flex flex-col h-full rounded-lg border border-gray-200">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Chat trận đấu</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-6">Chưa có tin nhắn</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`text-xs ${
                m.isSystem
                  ? 'text-blue-600 text-center italic'
                  : m.isMine
                    ? 'text-green-700'
                    : 'text-gray-700'
              }`}
            >
              {!m.isSystem && <span className="font-semibold mr-1">{m.sender}:</span>}
              <span>{m.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1 p-2 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Trận đấu kết thúc' : 'Nhắn tin...'}
          maxLength={150}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-md text-xs transition-colors"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// MAIN COMPONENT: RankedGamePage
// ═════════════════════════════════════════════════════
const RankedGamePage = () => {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const storeUser = useAuthStore((s) => s.user)
  const setAuthLogin = useAuthStore((s) => s.login)
  const authToken = useAuthStore((s) => s.token)
  const { showNotification } = useNotification()
  const [rankedStats, setRankedStats] = useState(null)

  // ─── Nhận dữ liệu trận đấu từ Lobby (qua navigate state) ───
  const locationMatchData = location.state?.matchData

  // ─── Players ───
  const player = useMemo(
    () =>
      storeUser
        ? {
            id: normalizeId(storeUser.id || storeUser.userId || storeUser._id || storeUser.sub),
            username: getUserDisplayName(storeUser, DEFAULT_PLAYER.username),
            rating: Number(rankedStats?.currentRating ?? storeUser.rating ?? DEFAULT_PLAYER.rating),
            avatarUrl: storeUser.avatarUrl || DEFAULT_PLAYER.avatarUrl,
          }
        : DEFAULT_PLAYER,
    [rankedStats?.currentRating, storeUser]
  )
  const [opponent, setOpponent] = useState(
    locationMatchData?.opponent
      ? {
          id: locationMatchData.opponent.id || 'opp-1',
          username: getUserDisplayName(locationMatchData.opponent, DEFAULT_OPPONENT.username),
          rating: locationMatchData.opponent.rating,
          avatarUrl: locationMatchData.opponent.avatarUrl,
        }
      : DEFAULT_OPPONENT
  )
  const [playerColor, setPlayerColor] = useState(locationMatchData?.color || 'white')

  // ─── Chess Logic ───
  const gameRef = useRef(new ChessGame())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [moveHistory, setMoveHistory] = useState([])
  const [lastMove, setLastMove] = useState(null)

  // ─── Game phase ───
  const [gamePhase, setGamePhase] = useState(GAME_PHASE.LOADING)

  // ─── Clocks ───
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME_MS)
  const [blackTime, setBlackTime] = useState(INITIAL_TIME_MS)
  const clockRef = useRef(null)
  const lastTickRef = useRef(null)

  // ─── End game ───
  const [endResult, setEndResult] = useState(null) // { result, reason }
  const [showEndModal, setShowEndModal] = useState(false)
  const [persistedResultData, setPersistedResultData] = useState(null)
  const endedRef = useRef(false)
  const currentUserId = normalizeId(
    storeUser?.id || storeUser?.userId || storeUser?._id || storeUser?.sub
  )

  // ─── Draw / Resign ───
  const [drawOffer, setDrawOffer] = useState(null) // null | 'sent' | 'received'
  const [showResignConfirm, setShowResignConfirm] = useState(false)

  // ─── Chat ───
  const [chatMessages, setChatMessages] = useState([
    { text: 'Game started. Good luck!', isSystem: true },
  ])
  const chatSeenIdsRef = useRef(new Set())

  // ─── Sound ───
  const [soundEnabled, setSoundEnabled] = useState(true)
  const soundRefs = useRef({
    move: null,
    capture: null,
    check: null,
    gameEnd: null,
  })

  // Initialize sound effects (using Web Audio API fallback)
  useEffect(() => {
    const createTone =
      (freq, duration, type = 'sine') =>
      () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = type
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + duration)
        } catch {
          /* silent fallback */
        }
      }
    soundRefs.current = {
      move: createTone(600, 0.08),
      capture: createTone(300, 0.15, 'square'),
      check: createTone(880, 0.2, 'sawtooth'),
      gameEnd: createTone(440, 0.4, 'triangle'),
    }
  }, [])

  const playSound = useCallback(
    (name) => {
      if (!soundEnabled) return
      soundRefs.current[name]?.()
    },
    [soundEnabled]
  )

  // ─── Opponent disconnect ───
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)

  // ─── WebSocket (for future online play) ───
  const gameSocket = useGameSocket(matchId)

  const persistRankedResult = useCallback(
    async (reason, result) => {
      if (!matchId) return

      try {
        const payload = {
          result: toRankedApiResult(playerColor, result),
          reason,
          moves: gameRef.current.history({ verbose: true }),
        }

        const response = await gameService.completeRankedMatch(matchId, payload)
        const data = response?.data ?? response
        setPersistedResultData(data)

        const player = data?.player
        if (!player) return

        const token = authToken
        if (!token) return

        const mergedUser = {
          ...(storeUser || {}),
          rating: player.ratingAfter,
          gamesPlayed: player.gamesPlayed,
          wins: player.wins,
          losses: player.losses,
          draws: player.draws,
        }
        setAuthLogin(mergedUser, token)
      } catch (error) {
        console.error('Failed to persist ranked result:', error)
        showNotification({
          type: 'error',
          title: 'Không thể lưu kết quả',
          message: 'Ván đấu đã kết thúc nhưng không lưu được lịch sử.',
        })
      }
    },
    [authToken, matchId, playerColor, setAuthLogin, showNotification, storeUser]
  )

  // ─── Derived state (recalculated each render) ───
  const currentTurn = gameRef.current.turn() // 'w' | 'b'
  const myColorCode = playerColor === 'white' ? 'w' : 'b'
  const isMyTurn =
    gamePhase === GAME_PHASE.PLAYING && !endedRef.current && currentTurn === myColorCode
  const isCheck = gameRef.current.inCheck()
  const isWhite = playerColor === 'white'

  useEffect(() => {
    if (!locationMatchData) return

    if (locationMatchData?.color === 'white' || locationMatchData?.color === 'black') {
      setPlayerColor(locationMatchData.color)
    }

    if (locationMatchData?.opponent) {
      setOpponent((prev) => ({
        ...prev,
        id: locationMatchData.opponent.id || locationMatchData.opponent.userId || prev.id,
        username: getUserDisplayName(locationMatchData.opponent, prev.username),
        rating: locationMatchData.opponent.rating || prev.rating,
        avatarUrl: locationMatchData.opponent.avatarUrl || prev.avatarUrl,
      }))
    }
  }, [locationMatchData])

  useEffect(() => {
    if (!matchId || !currentUserId) return

    let mounted = true
    void gameService
      .getMatch(matchId)
      .then((response) => {
        if (!mounted) return

        const data = response?.data ?? response
        const whiteId = normalizeId(data?.whitePlayerId || data?.white?.userId || data?.white?.id)
        const blackId = normalizeId(data?.blackPlayerId || data?.black?.userId || data?.black?.id)

        if (currentUserId === whiteId) {
          setPlayerColor('white')
        } else if (currentUserId === blackId) {
          setPlayerColor('black')
        }

        const whiteUser = data?.white || null
        const blackUser = data?.black || null
        const isMeWhite = currentUserId === whiteId
        const opp = isMeWhite ? blackUser : whiteUser
        if (opp) {
          setOpponent((prev) => ({
            ...prev,
            id: normalizeId(opp.id || opp.userId) || prev.id,
            username: getUserDisplayName(opp, prev.username),
            rating: Number(opp.rating ?? prev.rating),
            avatarUrl: opp.avatarUrl || prev.avatarUrl,
          }))
        }
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [currentUserId, matchId])

  useEffect(() => {
    let mounted = true
    void gameService
      .getRankedStats()
      .then((stats) => {
        if (!mounted) return
        setRankedStats(stats)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  // ─── Captured pieces & material ───
  const { capturedByWhite, capturedByBlack, matAdv } = useMemo(() => {
    const mat = gameRef.current.getMaterial()
    const capW = [] // white captured (from black)
    const capB = [] // black captured (from white)
    PIECE_ORDER.forEach((pc) => {
      for (let i = 0; i < STARTING_MATERIAL[pc] - mat.b[pc]; i++) capW.push(pc)
    })
    PIECE_ORDER.forEach((pc) => {
      for (let i = 0; i < STARTING_MATERIAL[pc] - mat.w[pc]; i++) capB.push(pc)
    })
    return {
      capturedByWhite: capW,
      capturedByBlack: capB,
      matAdv: gameRef.current.getMaterialAdvantage(),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen])

  // ─── Square highlights ───
  const squareStyles = useMemo(() => {
    const s = {}
    // Last move
    if (lastMove) {
      s[lastMove.from] = { background: 'rgba(255, 255, 0, 0.2)' }
      s[lastMove.to] = { background: 'rgba(255, 255, 0, 0.3)' }
    }
    // Check — highlight king
    if (isCheck && gamePhase !== GAME_PHASE.ENDED) {
      const board = gameRef.current.board()
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c]
          if (sq && sq.type === 'k' && sq.color === currentTurn) {
            const file = String.fromCharCode(97 + c)
            const rank = 8 - r
            s[`${file}${rank}`] = {
              background:
                'radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0.2) 60%, transparent 70%)',
            }
          }
        }
      }
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove, isCheck, currentTurn, gamePhase, fen])

  // ═══════════════════════════════════════════
  // GAME LIFECYCLE — simulate match load
  // ═══════════════════════════════════════════
  useEffect(() => {
    const t = setTimeout(() => {
      setGamePhase(GAME_PHASE.PLAYING)
      const whiteStarterName = playerColor === 'white' ? player.username : opponent.username
      setChatMessages((prev) => [
        ...prev,
        { text: `Trận đấu bắt đầu! ${whiteStarterName} (Trắng) đi trước.`, isSystem: true },
      ])
    }, 800)
    return () => clearTimeout(t)
  }, [opponent.username, player.username, playerColor])

  // ═══════════════════════════════════════════
  // CLOCK INTERVAL
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING) return

    lastTickRef.current = performance.now()
    clockRef.current = setInterval(() => {
      if (endedRef.current) return
      const now = performance.now()
      const dt = now - lastTickRef.current
      lastTickRef.current = now

      const turn = gameRef.current.turn()
      if (turn === 'w') {
        setWhiteTime((prev) => Math.max(0, prev - dt))
      } else {
        setBlackTime((prev) => Math.max(0, prev - dt))
      }
    }, CLOCK_TICK_MS)

    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [gamePhase])

  // ═══════════════════════════════════════════
  // END GAME HELPER
  // ═══════════════════════════════════════════
  const endGame = useCallback(
    (reason, result) => {
      if (endedRef.current) return
      endedRef.current = true
      setGamePhase(GAME_PHASE.ENDED)
      if (clockRef.current) clearInterval(clockRef.current)
      setEndResult({ result, reason })

      const txt = result === 'win' ? 'You won' : result === 'lose' ? 'You lost' : 'Game drawn'
      setChatMessages((prev) => [
        ...prev,
        { text: `Game Over — ${txt} (${reason})`, isSystem: true },
      ])
      showNotification({
        type: result === 'draw' ? 'info' : result === 'win' ? 'success' : 'error',
        title: result === 'draw' ? 'Hòa cờ' : result === 'win' ? 'Bạn thắng' : 'Bạn thua',
        message:
          reason === 'timeout'
            ? 'Trận đấu đã kết thúc do hết giờ.'
            : reason === 'resignation'
              ? 'Trận đấu đã kết thúc do có người đầu hàng.'
              : 'Trận đấu đã kết thúc và đang hiển thị kết quả.',
      })
      playSound('gameEnd')
      void persistRankedResult(reason, result)
      setTimeout(() => setShowEndModal(true), 600)
    },
    [persistRankedResult, playSound, showNotification]
  )

  // ─── Timeout detection (runs each clock tick) ───
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current) return
    if (whiteTime <= 0) {
      endGame('timeout', playerColor === 'white' ? 'lose' : 'win')
    } else if (blackTime <= 0) {
      endGame('timeout', playerColor === 'black' ? 'lose' : 'win')
    }
  }, [whiteTime, blackTime, gamePhase, playerColor, endGame])

  // ─── Check for checkmate / stalemate / draw ───
  const checkGameEnd = useCallback(() => {
    const g = gameRef.current
    if (g.isCheckmate()) {
      const loser = g.turn()
      const res =
        (loser === 'w' && playerColor === 'white') || (loser === 'b' && playerColor === 'black')
          ? 'lose'
          : 'win'
      endGame('checkmate', res)
      return true
    }
    if (g.isStalemate()) {
      endGame('stalemate', 'draw')
      return true
    }
    if (g.isDraw()) {
      endGame(g.getResultReason() || 'draw', 'draw')
      return true
    }
    return false
  }, [playerColor, endGame])

  // Inactivity timer disabled for local 2P mode

  // ═══════════════════════════════════════════
  // DISCONNECT HANDLING — listen for opponent events
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!gameSocket) return

    const handleMoveUpdate = (payload) => {
      const move = payload?.move
      if (!move?.from || !move?.to) return

      const result = gameRef.current.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })

      if (!result) return

      setFen(gameRef.current.fen())
      setMoveHistory(gameRef.current.history({ verbose: true }))
      setLastMove({ from: result.from, to: result.to })
      setDrawOffer(null)

      if (result.captured) playSound('capture')
      else playSound('move')

      const ended = checkGameEnd()
      if (!ended && gameRef.current.inCheck()) playSound('check')
    }

    const handleOpponentDisconnect = () => {
      setOpponentDisconnected(true)
      setChatMessages((prev) => [
        ...prev,
        { text: '⚠️ Opponent disconnected. Waiting for reconnect...', isSystem: true },
      ])
    }

    const handleOpponentReconnect = () => {
      setOpponentDisconnected(false)
      setChatMessages((prev) => [...prev, { text: '✅ Opponent reconnected.', isSystem: true }])
    }

    const handleGameEnd = (payload) => {
      const reason = payload?.reason || 'completed'
      const result = toLocalResultFromServer(playerColor, payload?.result)
      endGame(reason, result)
    }

    const handleChatMessage = (payload) => {
      const text = String(payload?.text || '').trim()
      if (!text) return

      const senderId = normalizeId(payload?.fromUserId)
      const messageId =
        typeof payload?.messageId === 'string' && payload.messageId.trim()
          ? payload.messageId.trim()
          : `${senderId || 'unknown'}-${payload?.at || Date.now()}`

      if (chatSeenIdsRef.current.has(messageId)) return
      chatSeenIdsRef.current.add(messageId)

      setChatMessages((prev) => [
        ...prev,
        {
          id: messageId,
          sender: senderId && senderId === currentUserId ? player.username : opponent.username,
          text,
          isMine: Boolean(senderId && senderId === currentUserId),
        },
      ])
    }

    const handleDrawOfferEvent = (payload) => {
      const eventType = String(payload?.type || '').toLowerCase()
      const actorId = String(payload?.fromUserId || payload?.byUserId || '')
      const isFromMe = Boolean(currentUserId && actorId && String(currentUserId) === actorId)

      if (eventType === 'offer') {
        if (isFromMe) return
        setDrawOffer('received')
        setChatMessages((prev) => [
          ...prev,
          { text: `${opponent.username} đề nghị hòa. Chấp nhận hay từ chối?`, isSystem: true },
        ])
        return
      }

      if (eventType === 'accepted') {
        setDrawOffer(null)
        if (!endedRef.current) {
          endGame('draw_agreement', 'draw')
        }
        return
      }

      if (eventType === 'declined') {
        if (isFromMe) {
          setChatMessages((prev) => [
            ...prev,
            { text: 'Đối thủ đã từ chối đề nghị hòa.', isSystem: true },
          ])
        }
        setDrawOffer(null)
      }
    }

    gameSocket.onMoveUpdate(handleMoveUpdate)
    gameSocket.onGameEnd(handleGameEnd)
    gameSocket.onDrawOffer(handleDrawOfferEvent)
    gameSocket.onChatMessage?.(handleChatMessage)
    gameSocket.onOpponentDisconnected(handleOpponentDisconnect)
    gameSocket.onOpponentReconnected(handleOpponentReconnect)
    return () => {
      gameSocket.off('game:moveUpdate', handleMoveUpdate)
      gameSocket.off('game:end', handleGameEnd)
      gameSocket.off('game:drawOffer', handleDrawOfferEvent)
      gameSocket.off('game:chat', handleChatMessage)
      gameSocket.off('game:opponentDisconnected', handleOpponentDisconnect)
      gameSocket.off('game:opponentReconnected', handleOpponentReconnect)
    }
  }, [
    gameSocket,
    checkGameEnd,
    playSound,
    playerColor,
    endGame,
    currentUserId,
    opponent.username,
    player.username,
  ])

  // ═══════════════════════════════════════════
  // COMMIT MOVE  — shared by drag-drop & click
  // ═══════════════════════════════════════════
  // handleChessBoardMove — callback from ChessBoard component after each move
  const handleChessBoardMove = useCallback(
    (move) => {
      setFen(gameRef.current.fen())
      setMoveHistory(gameRef.current.history({ verbose: true }))
      setLastMove({ from: move.from, to: move.to })
      setDrawOffer(null)

      if (move.captured) playSound('capture')
      else playSound('move')

      const ended = checkGameEnd()
      if (!ended && gameRef.current.inCheck()) playSound('check')

      if (gameSocket?.isConnected && matchId) {
        gameSocket.sendMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
        })
      }
    },
    [checkGameEnd, gameSocket, playSound, matchId]
  )

  // AI đã bị tắt — chế độ local 2 người chơi luân phiên trên 1 máy

  // ═══════════════════════════════════════════
  // CONTROLS: Resign / Draw / Chat
  // ═══════════════════════════════════════════
  const handleResign = useCallback(() => {
    if (showResignConfirm) {
      if (gameSocket?.isConnected && matchId) {
        gameSocket.resign()
      } else {
        endGame('resignation', 'lose')
      }
      setShowResignConfirm(false)
    } else {
      setShowResignConfirm(true)
      setTimeout(() => setShowResignConfirm(false), 4000)
    }
  }, [showResignConfirm, gameSocket, matchId, endGame])

  const handleOfferDraw = useCallback(() => {
    if (drawOffer) return
    if (gameSocket?.isConnected && matchId) {
      gameSocket.offerDraw()
      setDrawOffer('sent')
      setChatMessages((prev) => [
        ...prev,
        { text: 'Đã gửi đề nghị hòa đến đối thủ.', isSystem: true },
      ])
      return
    }
    const whiteName = playerColor === 'white' ? player.username : opponent.username
    const blackName = playerColor === 'black' ? player.username : opponent.username
    const side = gameRef.current.turn() === 'w' ? whiteName : blackName
    setChatMessages((prev) => [
      ...prev,
      { text: `${side} đề nghị hòa. Chấp nhận hay từ chối?`, isSystem: true },
    ])
  }, [drawOffer, gameSocket, matchId, opponent.username, player.username, playerColor])

  const handleAcceptDraw = useCallback(() => {
    if (gameSocket?.isConnected && matchId) {
      gameSocket.acceptDraw()
      setDrawOffer(null)
      return
    }
    endGame('draw_agreement', 'draw')
    setDrawOffer(null)
  }, [endGame, gameSocket, matchId])

  const handleDeclineDraw = useCallback(() => {
    if (gameSocket?.isConnected && matchId) {
      gameSocket.declineDraw()
    }
    setDrawOffer(null)
    setChatMessages((prev) => [...prev, { text: 'Bạn đã từ chối đề nghị hòa.', isSystem: true }])
  }, [gameSocket, matchId])

  const handleSendChat = useCallback(
    (text) => {
      const message = String(text || '').trim()
      if (!message) return

      const messageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      chatSeenIdsRef.current.add(messageId)
      setChatMessages((prev) => [
        ...prev,
        { id: messageId, sender: player.username, text: message, isMine: true },
      ])

      if (gameSocket?.isConnected && matchId) {
        gameSocket.sendChat?.({
          text: message,
          messageId,
        })
      }
    },
    [gameSocket, matchId, player.username]
  )

  // ═══════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════
  const goToLobby = useCallback(() => navigate('/ranked'), [navigate])
  const goToHistory = useCallback(() => navigate('/ranked/history'), [navigate])

  // ═══════════════════════════════════════════
  // NAVIGATE-AWAY FORFEIT
  // block browser tab close/refresh; in-app back button shows confirm
  // ═══════════════════════════════════════════
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingLeavePath, setPendingLeavePath] = useState(null)
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gamePhase])

  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING) return

    const handleDocumentNavigation = (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (href.startsWith('#') && !href.startsWith('#/')) return
      if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey) return

      let targetPath = null
      if (href.startsWith('#/')) {
        targetPath = href.slice(1)
      } else {
        const resolved = new URL(href, window.location.origin)
        if (resolved.origin !== window.location.origin) return
        targetPath = resolved.hash?.startsWith('#/')
          ? resolved.hash.slice(1)
          : `${resolved.pathname}${resolved.search}${resolved.hash}`
      }
      const currentPath = window.location.hash?.startsWith('#/')
        ? window.location.hash.slice(1)
        : `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (!targetPath || targetPath === currentPath) return

      event.preventDefault()
      event.stopPropagation()
      setPendingLeavePath(targetPath)
      setShowLeaveConfirm(true)
    }

    document.addEventListener('click', handleDocumentNavigation, true)
    return () => document.removeEventListener('click', handleDocumentNavigation, true)
  }, [gamePhase])

  const handleBackClick = useCallback(() => {
    if (gamePhase === GAME_PHASE.PLAYING) {
      setPendingLeavePath('/ranked')
      setShowLeaveConfirm(true)
    } else {
      goToLobby()
    }
  }, [gamePhase, goToLobby])

  const handleForfeitAndLeave = useCallback(async () => {
    const destination = pendingLeavePath || '/ranked'

    if (gamePhase === GAME_PHASE.PLAYING && !endedRef.current) {
      if (gameSocket?.isConnected && matchId) {
        gameSocket.resign()
      }
      await persistRankedResult('resignation', 'lose')
    }

    setShowLeaveConfirm(false)
    setPendingLeavePath(null)
    navigate(destination)
  }, [gamePhase, gameSocket, matchId, navigate, pendingLeavePath, persistRankedResult])

  // ═══════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════
  if (gamePhase === GAME_PHASE.LOADING) {
    return (
      <MainLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-gray-900">Đang tải trận đấu...</h2>
          <p className="text-gray-500 text-sm">Chuẩn bị bàn cờ · {matchId || 'local'}</p>
        </div>
      </MainLayout>
    )
  }

  // ═══════════════════════════════════════════
  // COMPUTED VALUES FOR RENDER
  // ═══════════════════════════════════════════
  const fallbackRatingChange = endResult
    ? calcMockRatingDelta(endResult.result, player.rating, opponent.rating)
    : 0
  const ratingChange = Number(persistedResultData?.player?.ratingDelta ?? fallbackRatingChange)
  const newRating = Number(persistedResultData?.player?.ratingAfter ?? player.rating + ratingChange)

  // Board orientation: luôn hiển thị đối thủ ở trên, người chơi ở dưới.
  const topPlayer = opponent
  const bottomPlayer = player
  const topTime = isWhite ? blackTime : whiteTime
  const bottomTime = isWhite ? whiteTime : blackTime

  const playing = gamePhase === GAME_PHASE.PLAYING
  const topActive =
    playing && ((isWhite && currentTurn === 'b') || (!isWhite && currentTurn === 'w'))
  const bottomActive =
    playing && ((isWhite && currentTurn === 'w') || (!isWhite && currentTurn === 'b'))

  // Captured pieces are tied to the player's actual side, not the screen position.
  const topSide = isWhite ? 'black' : 'white'
  const bottomSide = isWhite ? 'white' : 'black'
  const topCaptured = topSide === 'white' ? capturedByWhite : capturedByBlack
  const bottomCaptured = bottomSide === 'white' ? capturedByWhite : capturedByBlack
  const topCapColor = topSide === 'white' ? 'b' : 'w'
  const botCapColor = bottomSide === 'white' ? 'b' : 'w'
  const topMaterialAdvantage =
    topSide === 'white' ? Math.max(0, matAdv) : Math.max(0, -matAdv)
  const bottomMaterialAdvantage =
    bottomSide === 'white' ? Math.max(0, matAdv) : Math.max(0, -matAdv)

  // Status text
  const whiteSideName = isWhite ? player.username : opponent.username
  const blackSideName = isWhite ? opponent.username : player.username
  const currentPlayerName =
    currentTurn === 'w' ? `${whiteSideName} (Trắng)` : `${blackSideName} (Đen)`
  const statusText =
    gamePhase === GAME_PHASE.ENDED
      ? endResult?.result === 'win'
        ? '🎉 Chiến thắng!'
        : endResult?.result === 'lose'
          ? '😔 Thua trận'
          : '🤝 Hòa'
      : isCheck
        ? `⚡ Chiếu! — ${currentPlayerName}`
        : `🟢 Lượt: ${currentPlayerName}`

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <MainLayout>
      {/* Leave-game confirm dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bỏ trận?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Rời trang trong khi đang đấu sẽ bị tính là thua.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false)
                  setPendingLeavePath(null)
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
              >
                Ở lại
              </button>
              <button
                onClick={handleForfeitAndLeave}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Rời và thua
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1500px] mx-auto px-2 sm:px-4 py-2">
        <div className="ui-surface ui-card-padding mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackClick}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title="Về Lobby"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  Ranked Match
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  {matchId || 'match'} · 10+0 · Có xếp hạng
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span className="ui-chip">
                {gameSocket?.isConnected ? 'Socket: online' : 'Socket: offline'}
              </span>
              <span className="ui-chip">{playerColor === 'white' ? 'Bạn: Trắng' : 'Bạn: Đen'}</span>
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title={soundEnabled ? 'Tắt âm' : 'Mở âm'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_370px] gap-4 items-start">
          <section className="ui-surface p-2 sm:p-3">
            <PlayerBar
              player={topPlayer}
              timeMs={topTime}
              isActive={topActive}
              capturedPieces={topCaptured}
              capturedColor={topCapColor}
              materialAdvantage={topMaterialAdvantage}
            />

            <div className="my-2 w-full" style={{ maxWidth: 'min(calc(100vh - 210px), 100%)', margin: '8px auto' }}>
              <ChessBoard
                gameState={gameRef.current}
                onMove={handleChessBoardMove}
                playerColor={playerColor}
                disabled={gamePhase !== GAME_PHASE.PLAYING || endedRef.current || !isMyTurn}
                customSquareStyles={squareStyles}
                showMoveHints={true}
                showCoordinates={true}
                highlightCheck={true}
                soundEnabled={false}
              />
            </div>

            <PlayerBar
              player={bottomPlayer}
              timeMs={bottomTime}
              isActive={bottomActive}
              capturedPieces={bottomCaptured}
              capturedColor={botCapColor}
              materialAdvantage={bottomMaterialAdvantage}
            />
          </section>

          <aside className="ui-surface overflow-hidden xl:sticky xl:top-16 flex flex-col">
            {opponentDisconnected && gamePhase === GAME_PHASE.PLAYING && (
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Đối thủ ngắt kết nối. Chờ kết nối lại...</span>
                </div>
              </div>
            )}

            <div
              className={`px-4 py-3 text-sm font-semibold border-b border-gray-200 ${
                gamePhase === GAME_PHASE.ENDED
                  ? endResult?.result === 'win'
                    ? 'bg-green-50 text-green-700'
                    : endResult?.result === 'lose'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  : isCheck
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-700'
              }`}
            >
              {statusText}
            </div>

            {drawOffer === 'received' && (
              <DrawOfferBanner
                from={opponent.username}
                onAccept={handleAcceptDraw}
                onDecline={handleDeclineDraw}
              />
            )}

            {drawOffer === 'sent' && (
              <div className="mx-3 mt-3 bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm text-blue-800 font-medium">
                Đã gửi đề nghị hòa. Đang chờ đối thủ phản hồi...
              </div>
            )}

            <div className="px-3 pt-3 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <List className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  Move history
                </span>
                <span className="text-xs text-gray-400 ml-auto">{moveHistory.length} nước</span>
              </div>
              <div className="h-[240px]">
                <MoveListPanel moves={moveHistory} />
              </div>
            </div>

            <div className="px-3 py-3 h-[260px]">
              <InlineChat
                messages={chatMessages}
                onSend={handleSendChat}
                disabled={gamePhase === GAME_PHASE.ENDED}
              />
            </div>

            <div className="px-3 py-3 border-t border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              <button
                onClick={handleResign}
                disabled={!playing}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !playing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : showResignConfirm
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700'
                }`}
              >
                {showResignConfirm ? <AlertTriangle className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                {showResignConfirm ? 'Xác nhận đầu hàng?' : 'Đầu hàng'}
              </button>

              <button
                onClick={handleOfferDraw}
                disabled={!playing || drawOffer !== null || !gameSocket?.isConnected}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !playing || drawOffer !== null || !gameSocket?.isConnected
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-gray-700'
                }`}
              >
                <Handshake className="w-4 h-4" />
                Đề nghị hòa
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── End-game modal overlay ─── */}
      <EndGameModal
        isOpen={showEndModal}
        result={endResult?.result}
        reason={endResult?.reason}
        ratingChange={ratingChange}
        newRating={newRating}
        player={player}
        opponent={opponent}
        playerColorLabel={playerColor === 'white' ? 'Trắng' : 'Đen'}
        onBackToLobby={goToLobby}
        onViewHistory={goToHistory}
      />
    </MainLayout>
  )
}

export default RankedGamePage
