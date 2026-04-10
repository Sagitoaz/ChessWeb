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
import { useGameSocket } from '@hooks/useWebSocket'
import { useAuthStore } from '@store'
import { ChessGame } from '@utils/chessLogic'
import { RANKS } from '@utils/constants'
import { formatEloDelta, eloDeltaColor } from '@utils/formatters'
import { THEME } from '@/styles/theme'

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
const AI_DELAY_MIN = 1200
const AI_DELAY_MAX = 3500
const INACTIVITY_WARNING_SEC = 90 // warn at 90s
const INACTIVITY_TIMEOUT_SEC = 120 // auto-resign at 120s

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

/** Pick a random legal move (prefers captures 50 %) */
const pickAIMove = (game) => {
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) return null
  const captures = moves.filter((m) => m.captured)
  if (captures.length > 0 && Math.random() > 0.5) {
    return captures[Math.floor(Math.random() * captures.length)]
  }
  return moves[Math.floor(Math.random() * moves.length)]
}

/** Elo formula mock: K × (S – E), K = 32 */
const calcMockRatingDelta = (result, pRating, oRating) => {
  const E = 1 / (1 + Math.pow(10, (oRating - pRating) / 400))
  const S = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  return Math.round(32 * (S - E))
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
  materialAdv,
  isTop,
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
            advantage={
              isTop
                ? materialAdv < 0
                  ? Math.abs(materialAdv)
                  : 0
                : materialAdv > 0
                  ? materialAdv
                  : 0
            }
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
          <p className="text-xs text-gray-500 mb-1">Thay đổi ELO (Trắng)</p>
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
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
        >
          Decline
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
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Game started — make your move!
      </div>
    )
  }

  const pairs = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      n: Math.floor(i / 2) + 1,
      w: moves[i],
      b: moves[i + 1] || null,
      wi: i,
      bi: i + 1,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {pairs.map((p) => (
          <div key={p.n} className="flex items-center gap-1 text-sm">
            <span className="w-7 text-gray-500 text-xs font-mono text-right">{p.n}.</span>
            <span
              className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                p.wi === moves.length - 1
                  ? 'bg-yellow-100 text-yellow-800 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.w?.san || ''}
            </span>
            {p.b && (
              <span
                className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                  p.bi === moves.length - 1
                    ? 'bg-yellow-100 text-yellow-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.b.san}
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
    <div className="flex flex-col border-t border-gray-200">
      {/* Messages */}
      <div className="h-28 overflow-y-auto p-2 space-y-1">
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
              {m.text}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-1 p-2 border-t border-gray-100">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Trận đấu kết thúc' : 'Nhắn tin...'}
          maxLength={150}
          className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded text-xs transition-colors"
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

  // ─── Nhận dữ liệu trận đấu từ Lobby (qua navigate state) ───
  const locationMatchData = location.state?.matchData

  // ─── Players ───
  const player = useMemo(
    () =>
      storeUser
        ? {
            id: storeUser.id,
            username: storeUser.username,
            rating: storeUser.rating || DEFAULT_PLAYER.rating,
            avatarUrl: storeUser.avatarUrl || DEFAULT_PLAYER.avatarUrl,
          }
        : DEFAULT_PLAYER,
    [storeUser]
  )
  const [opponent] = useState(
    locationMatchData?.opponent
      ? {
          id: locationMatchData.opponent.id || 'opp-1',
          username: locationMatchData.opponent.username,
          rating: locationMatchData.opponent.rating,
          avatarUrl: locationMatchData.opponent.avatarUrl,
        }
      : DEFAULT_OPPONENT
  )
  // Chế độ local 2 người: bỏ qua màu được gán, cả 2 cùng đi trên 1 máy
  const playerColor = locationMatchData?.color || 'white'

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
  const endedRef = useRef(false)

  // ─── Draw / Resign ───
  const [drawOffer, setDrawOffer] = useState(null) // null | 'sent' | 'received'
  const [showResignConfirm, setShowResignConfirm] = useState(false)

  // ─── Chat ───
  const [chatMessages, setChatMessages] = useState([
    { text: 'Game started. Good luck!', isSystem: true },
  ])

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

  // ─── Inactivity Timer ───
  const [inactivityTime, setInactivityTime] = useState(0)
  const [showAFKWarning, setShowAFKWarning] = useState(false)
  const inactivityRef = useRef(null)

  // ─── Opponent disconnect ───
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)

  // ─── WebSocket (for future online play) ───
  const gameSocket = useGameSocket(matchId)

  // ─── Derived state (recalculated each render) ───
  const currentTurn = gameRef.current.turn() // 'w' | 'b'
  // Local 2P: luôn cho phép di chuyển — cả 2 người cùng ngồi 1 máy
  const isMyTurn = gamePhase === GAME_PHASE.PLAYING && !endedRef.current
  const isCheck = gameRef.current.inCheck()
  const isWhite = playerColor === 'white'

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
      setChatMessages((prev) => [
        ...prev,
        { text: `Trận đấu bắt đầu! ${player.username} (Trắng) đi trước.`, isSystem: true },
      ])
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      if (inactivityRef.current) clearInterval(inactivityRef.current)
      setEndResult({ result, reason })
      setShowAFKWarning(false)

      const txt = result === 'win' ? 'You won' : result === 'lose' ? 'You lost' : 'Game drawn'
      setChatMessages((prev) => [
        ...prev,
        { text: `Game Over — ${txt} (${reason})`, isSystem: true },
      ])
      playSound('gameEnd')
      setTimeout(() => setShowEndModal(true), 600)
    },
    [playSound]
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

    gameSocket.onOpponentDisconnected(handleOpponentDisconnect)
    gameSocket.onOpponentReconnected(handleOpponentReconnect)
  }, [gameSocket])

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

      if (gameSocket?.isConnected) {
        gameSocket.sendMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
        })
      }
    },
    [checkGameEnd, gameSocket, playSound]
  )

  // AI đã bị tắt — chế độ local 2 người chơi luân phiên trên 1 máy

  // ═══════════════════════════════════════════
  // CONTROLS: Resign / Draw / Chat
  // ═══════════════════════════════════════════
  const handleResign = useCallback(() => {
    if (showResignConfirm) {
      // Bên đang đến lượt đầu hàng → bên kia thắng
      const resigningColor = gameRef.current.turn()
      const result = resigningColor === 'w' ? 'lose' : 'win' // relative to player (white)
      endGame('resignation', playerColor === 'white' ? result : result === 'win' ? 'lose' : 'win')
      setShowResignConfirm(false)
    } else {
      setShowResignConfirm(true)
      setTimeout(() => setShowResignConfirm(false), 4000)
    }
  }, [showResignConfirm, endGame, playerColor])

  const handleOfferDraw = useCallback(() => {
    if (drawOffer) return
    // Local 2P: đề nghị hòa → phía kia bấm Accept/Decline
    const side = gameRef.current.turn() === 'w' ? player.username : opponent.username
    setDrawOffer('received') // luôn hiển thị banner để bên kia xác nhận
    setChatMessages((prev) => [
      ...prev,
      { text: `${side} đề nghị hòa. Chấp nhận hay từ chối?`, isSystem: true },
    ])
  }, [drawOffer, player.username, opponent.username])

  const handleAcceptDraw = useCallback(() => {
    endGame('draw_agreement', 'draw')
    setDrawOffer(null)
  }, [endGame])

  const handleDeclineDraw = useCallback(() => {
    setDrawOffer(null)
    setChatMessages((prev) => [...prev, { text: 'You declined the draw', isSystem: true }])
  }, [])

  const handleSendChat = useCallback(
    (text) => {
      const side = gameRef.current.turn() === 'w' ? player.username : opponent.username
      setChatMessages((prev) => [...prev, { sender: side, text, isMine: true }])
    },
    [player.username, opponent.username]
  )

  // ═══════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════
  const goToLobby = useCallback(() => navigate('/ranked'), [navigate])
  const goToHistory = useCallback(() => navigate('/ranked/history'), [navigate])

  // ═══════════════════════════════════════════
  // CLEANUP on unmount
  // ═══════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (inactivityRef.current) clearInterval(inactivityRef.current)
    }
  }, [])

  // ═══════════════════════════════════════════
  // NAVIGATE-AWAY FORFEIT
  // block browser tab close/refresh; in-app back button shows confirm
  // ═══════════════════════════════════════════
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gamePhase])

  const handleBackClick = useCallback(() => {
    if (gamePhase === GAME_PHASE.PLAYING) {
      setShowLeaveConfirm(true)
    } else {
      goToLobby()
    }
  }, [gamePhase, goToLobby])

  const handleForfeitAndLeave = useCallback(() => {
    endGame('forfeit', 'lose')
    setShowLeaveConfirm(false)
    navigate('/ranked')
  }, [endGame, navigate])

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
  const ratingChange = endResult
    ? calcMockRatingDelta(endResult.result, player.rating, opponent.rating)
    : 0
  const newRating = player.rating + ratingChange

  // Board orientation: top = opponent, bottom = player
  const topPlayer = isWhite ? opponent : player
  const bottomPlayer = isWhite ? player : opponent
  const topTime = isWhite ? blackTime : whiteTime
  const bottomTime = isWhite ? whiteTime : blackTime

  const playing = gamePhase === GAME_PHASE.PLAYING
  const topActive =
    playing && ((isWhite && currentTurn === 'b') || (!isWhite && currentTurn === 'w'))
  const bottomActive =
    playing && ((isWhite && currentTurn === 'w') || (!isWhite && currentTurn === 'b'))

  // Captured pieces for each bar
  const topCaptured = isWhite ? capturedByBlack : capturedByWhite
  const bottomCaptured = isWhite ? capturedByWhite : capturedByBlack
  const topCapColor = isWhite ? 'w' : 'b' // color of pieces captured by top
  const botCapColor = isWhite ? 'b' : 'w'

  // Status text
  // Local 2P: hiển thị lượt hiện tại
  const currentPlayerName =
    currentTurn === 'w' ? `${player.username} (Trắng)` : `${opponent.username} (Đen)`
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
                onClick={() => setShowLeaveConfirm(false)}
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

      <div className="mx-auto px-2 sm:px-4 py-2">
        {/* ─── Header bar ─── */}
        <div className="flex items-center justify-between mb-2">
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
                {matchId || 'local'} · 10+0 · Có xếp hạng · Local 2P
              </p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title={soundEnabled ? 'Tắt âm' : 'Mở âm'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* ─── Main game area ─── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ═════ LEFT: Board column — takes ~60% width on desktop ═════ */}
          <div className="w-full lg:w-[60%] flex-shrink-0">
            {/* Opponent bar (top) */}
            <PlayerBar
              player={topPlayer}
              timeMs={topTime}
              isActive={topActive}
              capturedPieces={topCaptured}
              capturedColor={topCapColor}
              materialAdv={matAdv}
              isTop
            />

            {/* Chess board — dùng component ChessBoard có sẵn */}
            <div
              className="my-1 w-full"
              style={{ maxWidth: 'calc(100vh - 180px)', margin: '4px auto' }}
            >
              <ChessBoard
                gameState={gameRef.current}
                onMove={handleChessBoardMove}
                playerColor={playerColor}
                disabled={gamePhase !== GAME_PHASE.PLAYING || endedRef.current}
                customSquareStyles={squareStyles}
                showCoordinates={true}
                highlightCheck={true}
                soundEnabled={false}
              />
            </div>

            {/* Player bar (bottom) */}
            <PlayerBar
              player={bottomPlayer}
              timeMs={bottomTime}
              isActive={bottomActive}
              capturedPieces={bottomCaptured}
              capturedColor={botCapColor}
              materialAdv={matAdv}
              isTop={false}
            />
          </div>

          {/* ═════ RIGHT: Side panel ═════ */}
          <div
            className="w-full lg:flex-1 lg:min-w-[280px] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Opponent Disconnected Banner */}
            {opponentDisconnected && gamePhase === GAME_PHASE.PLAYING && (
              <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Đối thủ ngắt kết nối. Chờ kết nối lại...</span>
                </div>
              </div>
            )}

            {/* Status strip */}
            <div
              className={`px-4 py-2 text-sm font-semibold text-center border-b border-gray-200 ${
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

            {/* Draw offer banner */}
            {drawOffer === 'received' && (
              <DrawOfferBanner
                from={opponent.username}
                onAccept={handleAcceptDraw}
                onDecline={handleDeclineDraw}
              />
            )}

            {/* Moves header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
              <List className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nước đi
              </span>
              <span className="text-xs text-gray-400 ml-auto">{moveHistory.length} nước</span>
            </div>

            {/* Move list */}
            <MoveListPanel moves={moveHistory} />

            {/* Game controls */}
            <div className="px-3 py-2 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleResign}
                disabled={!playing}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  !playing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : showResignConfirm
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700'
                }`}
              >
                {showResignConfirm ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                {showResignConfirm ? 'Xác nhận?' : 'Đầu hàng'}
              </button>

              <button
                onClick={handleOfferDraw}
                disabled={!playing || drawOffer !== null}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  !playing || drawOffer !== null
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700'
                }`}
              >
                <Handshake className="w-4 h-4" />
                {drawOffer === 'received' ? 'Đề nghị hòa' : 'Đề nghị hòa'}
              </button>
            </div>

            {/* Inline chat */}
            <InlineChat
              messages={chatMessages}
              onSend={handleSendChat}
              disabled={gamePhase === GAME_PHASE.ENDED}
            />
          </div>
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
        onBackToLobby={goToLobby}
        onViewHistory={goToHistory}
      />
    </MainLayout>
  )
}

export default RankedGamePage
