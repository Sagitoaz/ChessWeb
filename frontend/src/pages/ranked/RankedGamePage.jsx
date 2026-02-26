import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Chessboard } from 'react-chessboard'
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
const getRankInfo = (rating) =>
  RANKS.find((r) => rating >= r.min && rating < r.max) || RANKS[0]

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
// MOCK DATA
// ─────────────────────────────────────────────────────
const MOCK_PLAYER = {
  id: 'player-1',
  username: 'ChessPlayer',
  rating: 1523,
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
}

const MOCK_OPPONENT = {
  id: 'opp-1',
  username: 'DarkKnight77',
  rating: 1498,
  avatarUrl: 'https://i.pravatar.cc/150?img=12',
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
        <span key={i} className="text-sm leading-none opacity-80">
          {PIECE_UNICODE[color][p]}
        </span>
      ))}
      {advantage > 0 && (
        <span className="text-xs font-bold text-white/60 ml-1">+{advantage}</span>
      )}
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
        isActive
          ? 'bg-[#3d3a37] border border-[#81b64c]/50'
          : 'bg-[#262421] border border-transparent'
      }`}
    >
      {/* Left ─ player info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar src={player.avatarUrl} alt={player.username} size="sm" />
          {isActive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#262421]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm truncate">
              {player.username}
            </span>
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
            ? 'bg-red-600/30 text-red-400 animate-pulse'
            : low && isActive
            ? 'bg-yellow-600/20 text-yellow-400'
            : isActive
            ? 'bg-[#81b64c]/20 text-white'
            : 'bg-gray-800/50 text-gray-400'
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

  const cfg = {
    win: {
      title: 'Victory!',
      icon: <Crown className="w-12 h-12 text-yellow-400" />,
      bg: 'from-yellow-900/40 to-green-900/30',
      border: 'border-yellow-600/50',
    },
    lose: {
      title: 'Defeat',
      icon: <Flag className="w-12 h-12 text-red-400" />,
      bg: 'from-red-900/30 to-gray-900/30',
      border: 'border-red-600/50',
    },
    draw: {
      title: 'Draw',
      icon: <Handshake className="w-12 h-12 text-blue-400" />,
      bg: 'from-blue-900/30 to-gray-900/30',
      border: 'border-blue-600/50',
    },
  }[result] || {
    title: 'Game Over',
    icon: <Swords className="w-12 h-12 text-gray-400" />,
    bg: 'from-gray-900 to-gray-900',
    border: 'border-gray-600',
  }

  const reasonLabel = {
    checkmate: 'by checkmate',
    resignation: 'by resignation',
    timeout: 'on time',
    stalemate: 'by stalemate',
    draw_agreement: 'by mutual agreement',
    insufficient_material: 'insufficient material',
    threefold_repetition: 'threefold repetition',
    fifty_move: '50-move rule',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-gradient-to-b ${cfg.bg} border ${cfg.border} rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-slideUp`}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">{cfg.icon}</div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-1">{cfg.title}</h2>
        <p className="text-gray-400 text-sm mb-6">{reasonLabel[reason] || reason}</p>

        {/* Players */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <Avatar src={player.avatarUrl} alt={player.username} size="sm" />
            <p className="text-xs text-gray-300 mt-1 truncate max-w-[80px]">
              {player.username}
            </p>
          </div>
          <span className="text-gray-600 font-bold text-lg">vs</span>
          <div className="text-center">
            <Avatar src={opponent.avatarUrl} alt={opponent.username} size="sm" />
            <p className="text-xs text-gray-300 mt-1 truncate max-w-[80px]">
              {opponent.username}
            </p>
          </div>
        </div>

        {/* Rating change */}
        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 mb-1">Rating Change</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-gray-400 text-lg">{player.rating}</span>
            <span className="text-gray-500">→</span>
            <span className={`text-2xl font-bold ${eloDeltaColor(ratingChange)}`}>
              {newRating}
            </span>
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
            className="w-full gap-2 bg-[#81b64c] hover:bg-[#6a9a3f] text-white"
          >
            <Swords className="w-4 h-4" />
            Back to Lobby
          </Button>
          <Button
            variant="ghost"
            onClick={onViewHistory}
            className="w-full gap-2 border border-gray-600 text-gray-300 hover:bg-gray-700/50"
          >
            <Eye className="w-4 h-4" />
            View History
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
  <div className="mx-3 my-2 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 animate-slideUp">
    <div className="flex items-center gap-3">
      <Handshake className="w-5 h-5 text-yellow-400 flex-shrink-0" />
      <p className="flex-1 text-sm text-yellow-200 font-medium">
        {from} offers a draw
      </p>
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
            <span className="w-7 text-gray-500 text-xs font-mono text-right">
              {p.n}.
            </span>
            <span
              className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                p.wi === moves.length - 1
                  ? 'bg-yellow-800/30 text-yellow-200'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {p.w?.san || ''}
            </span>
            {p.b && (
              <span
                className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                  p.bi === moves.length - 1
                    ? 'bg-yellow-800/30 text-yellow-200'
                    : 'text-gray-300 hover:bg-gray-700/50'
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
    <div className="flex flex-col border-t border-gray-700">
      {/* Messages */}
      <div className="h-28 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center mt-6">No messages</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`text-xs ${
                m.isSystem
                  ? 'text-yellow-400/70 text-center italic'
                  : m.isMine
                  ? 'text-blue-300'
                  : 'text-gray-300'
              }`}
            >
              {!m.isSystem && (
                <span className="font-semibold mr-1">{m.sender}:</span>
              )}
              {m.text}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-1 p-2 border-t border-gray-700/50"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Game ended' : 'Type a message...'}
          maxLength={150}
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#81b64c]/50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-2 py-1 bg-[#81b64c] hover:bg-[#6a9a3f] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-xs transition-colors"
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
  const isDemo = location.pathname.startsWith('/demo')
  const storeUser = useAuthStore((s) => s.user)

  // ─── Players ───
  const player = useMemo(
    () =>
      storeUser
        ? {
            id: storeUser.id,
            username: storeUser.username,
            rating: storeUser.rating || MOCK_PLAYER.rating,
            avatarUrl: storeUser.avatarUrl || MOCK_PLAYER.avatarUrl,
          }
        : MOCK_PLAYER,
    [storeUser],
  )
  const [opponent] = useState(MOCK_OPPONENT)
  const [playerColor] = useState('white') // player is always white in mock

  // ─── Chess Logic ───
  const gameRef = useRef(new ChessGame())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [moveHistory, setMoveHistory] = useState([])
  const [lastMove, setLastMove] = useState(null)

  // ─── Click-to-move state ───
  const [moveFrom, setMoveFrom] = useState(null)
  const [optionSquares, setOptionSquares] = useState({})

  // ─── Promotion state ───
  const [promotionToSquare, setPromotionToSquare] = useState(null)
  const [pendingPromoFrom, setPendingPromoFrom] = useState(null)

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
    const createTone = (freq, duration, type = 'sine') => () => {
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
      } catch { /* silent fallback */ }
    }
    soundRefs.current = {
      move: createTone(600, 0.08),
      capture: createTone(300, 0.15, 'square'),
      check: createTone(880, 0.2, 'sawtooth'),
      gameEnd: createTone(440, 0.4, 'triangle'),
    }
  }, [])

  const playSound = useCallback((name) => {
    if (!soundEnabled) return
    soundRefs.current[name]?.()
  }, [soundEnabled])

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
  const isMyTurn =
    (currentTurn === 'w' && playerColor === 'white') ||
    (currentTurn === 'b' && playerColor === 'black')
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
    // Click-to-move option dots
    return { ...s, ...optionSquares }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove, isCheck, currentTurn, gamePhase, fen, optionSquares])

  // ═══════════════════════════════════════════
  // GAME LIFECYCLE — simulate match load
  // ═══════════════════════════════════════════
  useEffect(() => {
    const t = setTimeout(() => {
      setGamePhase(GAME_PHASE.PLAYING)
      setChatMessages((prev) => [
        ...prev,
        { text: 'You are playing as White. Your move!', isSystem: true },
      ])
    }, 800)
    return () => clearTimeout(t)
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
  const endGame = useCallback((reason, result) => {
    if (endedRef.current) return
    endedRef.current = true
    setGamePhase(GAME_PHASE.ENDED)
    if (clockRef.current) clearInterval(clockRef.current)
    if (inactivityRef.current) clearInterval(inactivityRef.current)
    setEndResult({ result, reason })
    setShowAFKWarning(false)

    const txt =
      result === 'win'
        ? 'You won'
        : result === 'lose'
        ? 'You lost'
        : 'Game drawn'
    setChatMessages((prev) => [
      ...prev,
      { text: `Game Over — ${txt} (${reason})`, isSystem: true },
    ])
    playSound('gameEnd')
    setTimeout(() => setShowEndModal(true), 600)
  }, [playSound])

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
        (loser === 'w' && playerColor === 'white') ||
        (loser === 'b' && playerColor === 'black')
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

  // ═══════════════════════════════════════════
  // INACTIVITY TIMER — warn at 90s, auto-resign at 120s
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current) {
      if (inactivityRef.current) clearInterval(inactivityRef.current)
      return
    }

    // Reset inactivity when turn changes
    setInactivityTime(0)
    setShowAFKWarning(false)

    if (!isMyTurn) {
      if (inactivityRef.current) clearInterval(inactivityRef.current)
      return
    }

    inactivityRef.current = setInterval(() => {
      setInactivityTime((prev) => {
        const next = prev + 1
        if (next === INACTIVITY_WARNING_SEC) {
          setShowAFKWarning(true)
          setChatMessages((p) => [
            ...p,
            { text: '⚠️ Make a move or you will lose! (30s remaining)', isSystem: true },
          ])
        }
        if (next >= INACTIVITY_TIMEOUT_SEC) {
          endGame('afk', 'lose')
          if (gameSocket?.isConnected) {
            gameSocket.emit?.('game:afkTimeout', { matchId })
          }
        }
        return next
      })
    }, 1000)

    return () => {
      if (inactivityRef.current) clearInterval(inactivityRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, gamePhase, endGame, matchId])

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
      setChatMessages((prev) => [
        ...prev,
        { text: '✅ Opponent reconnected.', isSystem: true },
      ])
    }

    gameSocket.onOpponentDisconnected(handleOpponentDisconnect)
    gameSocket.onOpponentReconnected(handleOpponentReconnect)
  }, [gameSocket])

  // ═══════════════════════════════════════════
  // COMMIT MOVE  — shared by drag-drop & click
  // ═══════════════════════════════════════════
  const commitMove = useCallback(
    (move) => {
      setFen(gameRef.current.fen())
      setMoveHistory(gameRef.current.history({ verbose: true }))
      setLastMove({ from: move.from, to: move.to })
      setMoveFrom(null)
      setOptionSquares({})
      setDrawOffer(null)

      // Reset inactivity on own move
      setInactivityTime(0)
      setShowAFKWarning(false)

      // Sound effects
      if (move.captured) {
        playSound('capture')
      } else {
        playSound('move')
      }

      const ended = checkGameEnd()

      // Play check sound if in check and game didn't end
      if (!ended && gameRef.current.inCheck()) {
        playSound('check')
      }

      if (gameSocket?.isConnected) {
        gameSocket.sendMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
        })
      }
    },
    [checkGameEnd, gameSocket, playSound],
  )

  // ═══════════════════════════════════════════
  // PROMOTION HELPERS
  // ═══════════════════════════════════════════

  /** Check whether a move from src→dst is a pawn promotion */
  const isPromotionMove = useCallback((src, dst) => {
    const piece = gameRef.current.get(src)
    if (!piece || piece.type !== 'p') return false
    const targetRank = dst[1]
    return (
      (piece.color === 'w' && targetRank === '8') ||
      (piece.color === 'b' && targetRank === '1')
    )
  }, [])

  /**
   * Called when the user picks a piece from our custom promotion dialog.
   * `promoType` is 'q', 'r', 'b', or 'n'.
   */
  const handlePromotionSelect = useCallback(
    (promoType) => {
      const from = pendingPromoFrom
      const to = promotionToSquare

      // Clear promotion state first
      setPromotionToSquare(null)
      setPendingPromoFrom(null)
      setMoveFrom(null)
      setOptionSquares({})

      if (!from || !to) return

      const move = gameRef.current.move({
        from,
        to,
        promotion: promoType,
      })

      if (move) {
        commitMove(move)
      }
    },
    [commitMove, pendingPromoFrom, promotionToSquare],
  )

  /** Cancel a pending promotion */
  const handlePromotionCancel = useCallback(() => {
    setPromotionToSquare(null)
    setPendingPromoFrom(null)
    setMoveFrom(null)
    setOptionSquares({})
  }, [])

  // ═══════════════════════════════════════════
  // PIECE DROP (drag & drop)
  // ═══════════════════════════════════════════
  const handlePieceDrop = useCallback(
    (src, dst) => {
      if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current || !isMyTurn)
        return false

      // If promotion → show custom dialog, don't commit yet
      if (isPromotionMove(src, dst)) {
        setPendingPromoFrom(src)
        setPromotionToSquare(dst)
        return false
      }

      const move = gameRef.current.move({
        from: src,
        to: dst,
      })
      if (!move) return false
      commitMove(move)
      return true
    },
    [gamePhase, isMyTurn, commitMove, isPromotionMove],
  )

  // ═══════════════════════════════════════════
  // CLICK-TO-MOVE
  // ═══════════════════════════════════════════
  const showMoveOptions = useCallback((square) => {
    const moves = gameRef.current.getMovesForSquare(square)
    const opts = {}
    moves.forEach((m) => {
      const isCapture = gameRef.current.get(m.to)
      opts[m.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(0,0,0,.15) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)',
      }
    })
    opts[square] = { background: 'rgba(255, 255, 0, 0.4)' }
    setOptionSquares(opts)
  }, [])

  const handleSquareClick = useCallback(
    (square) => {
      if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current || !isMyTurn) {
        setMoveFrom(null)
        setOptionSquares({})
        return
      }

      // Already selected a piece → try to move
      if (moveFrom) {
        // If this is a promotion move, show the dialog instead
        if (isPromotionMove(moveFrom, square)) {
          setPendingPromoFrom(moveFrom)
          setPromotionToSquare(square)
          return
        }

        const move = gameRef.current.move({
          from: moveFrom,
          to: square,
        })
        if (move) {
          commitMove(move)
          return
        }
        // Clicked another own piece → re-select
        const piece = gameRef.current.get(square)
        if (piece && piece.color === gameRef.current.turn()) {
          setMoveFrom(square)
          showMoveOptions(square)
          return
        }
        // Clear selection
        setMoveFrom(null)
        setOptionSquares({})
        return
      }

      // Select a piece
      const piece = gameRef.current.get(square)
      if (piece && piece.color === gameRef.current.turn()) {
        setMoveFrom(square)
        showMoveOptions(square)
      }
    },
    [gamePhase, isMyTurn, moveFrom, commitMove, showMoveOptions],
  )

  // Only allow dragging own pieces
  const isDraggable = useCallback(
    ({ piece }) => {
      if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current || !isMyTurn)
        return false
      const color = piece[0] // 'w' | 'b'
      return (
        (playerColor === 'white' && color === 'w') ||
        (playerColor === 'black' && color === 'b')
      )
    },
    [gamePhase, isMyTurn, playerColor],
  )

  // ═══════════════════════════════════════════
  // MOCK AI — opponent makes random moves
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (gamePhase !== GAME_PHASE.PLAYING || endedRef.current) return
    const oppTurn = playerColor === 'white' ? 'b' : 'w'
    if (gameRef.current.turn() !== oppTurn) return

    const delay = AI_DELAY_MIN + Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN)
    const timer = setTimeout(() => {
      if (endedRef.current) return
      const ai = pickAIMove(gameRef.current)
      if (!ai) return

      const move = gameRef.current.move({
        from: ai.from,
        to: ai.to,
        promotion: ai.promotion || 'q',
      })
      if (!move) return

      setFen(gameRef.current.fen())
      setMoveHistory(gameRef.current.history({ verbose: true }))
      setLastMove({ from: move.from, to: move.to })

      // Sound for opponent moves
      if (move.captured) {
        playSound('capture')
      } else {
        playSound('move')
      }

      const aiEnded = checkGameEnd()
      if (!aiEnded && gameRef.current.inCheck()) {
        playSound('check')
      }

      // Occasional bot chat
      if (Math.random() < 0.12) {
        const msgs = [
          'Good move!',
          'Interesting...',
          'Hmm 🤔',
          'Nice!',
          '😏',
          'Let me think...',
        ]
        setChatMessages((prev) => [
          ...prev,
          {
            sender: opponent.username,
            text: msgs[Math.floor(Math.random() * msgs.length)],
            isMine: false,
          },
        ])
      }

      // Rare draw offer from bot
      if (Math.random() < 0.04 && moveHistory.length > 20) {
        setDrawOffer('received')
        setChatMessages((prev) => [
          ...prev,
          { text: `${opponent.username} offers a draw`, isSystem: true },
        ])
      }
    }, delay)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, gamePhase, playerColor, checkGameEnd, opponent.username])

  // ═══════════════════════════════════════════
  // CONTROLS: Resign / Draw / Chat
  // ═══════════════════════════════════════════
  const handleResign = useCallback(() => {
    if (showResignConfirm) {
      endGame('resignation', 'lose')
      setShowResignConfirm(false)
    } else {
      setShowResignConfirm(true)
      setTimeout(() => setShowResignConfirm(false), 4000)
    }
  }, [showResignConfirm, endGame])

  const handleOfferDraw = useCallback(() => {
    if (drawOffer) return
    setDrawOffer('sent')
    setChatMessages((prev) => [
      ...prev,
      { text: 'You offered a draw', isSystem: true },
    ])
    // Opponent responds after delay
    setTimeout(() => {
      if (endedRef.current) return
      const accepted = Math.random() < 0.3
      if (accepted) {
        endGame('draw_agreement', 'draw')
      } else {
        setDrawOffer(null)
        setChatMessages((prev) => [
          ...prev,
          {
            text: `${opponent.username} declined the draw`,
            isSystem: true,
          },
        ])
      }
    }, 2000 + Math.random() * 2000)
  }, [drawOffer, endGame, opponent.username])

  const handleAcceptDraw = useCallback(() => {
    endGame('draw_agreement', 'draw')
    setDrawOffer(null)
  }, [endGame])

  const handleDeclineDraw = useCallback(() => {
    setDrawOffer(null)
    setChatMessages((prev) => [
      ...prev,
      { text: 'You declined the draw', isSystem: true },
    ])
  }, [])

  const handleSendChat = useCallback(
    (text) => {
      setChatMessages((prev) => [
        ...prev,
        { sender: player.username, text, isMine: true },
      ])
      // Bot occasionally replies
      if (Math.random() < 0.3) {
        setTimeout(() => {
          const replies = ['Thanks!', 'gg', '👍', 'Good one!', '🙂']
          setChatMessages((prev) => [
            ...prev,
            {
              sender: opponent.username,
              text: replies[Math.floor(Math.random() * replies.length)],
              isMine: false,
            },
          ])
        }, 1000 + Math.random() * 2000)
      }
    },
    [player.username, opponent.username],
  )

  // ═══════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════
  const goToLobby = useCallback(
    () => navigate(isDemo ? '/demo/ranked' : '/ranked'),
    [navigate, isDemo]
  )
  const goToHistory = useCallback(
    () => navigate(isDemo ? '/demo/ranked/history' : '/ranked/history'),
    [navigate, isDemo]
  )

  // ═══════════════════════════════════════════
  // CLEANUP on unmount
  // ═══════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (inactivityRef.current) clearInterval(inactivityRef.current)
    }
  }, [])

  // ═══════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════
  if (gamePhase === GAME_PHASE.LOADING) {
    return (
      <MainLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-white">Loading Game...</h2>
          <p className="text-gray-400 text-sm">
            Connecting to match {matchId || 'demo'}
          </p>
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
    playing &&
    ((isWhite && currentTurn === 'b') || (!isWhite && currentTurn === 'w'))
  const bottomActive =
    playing &&
    ((isWhite && currentTurn === 'w') || (!isWhite && currentTurn === 'b'))

  // Captured pieces for each bar
  const topCaptured = isWhite ? capturedByBlack : capturedByWhite
  const bottomCaptured = isWhite ? capturedByWhite : capturedByBlack
  const topCapColor = isWhite ? 'w' : 'b' // color of pieces captured by top
  const botCapColor = isWhite ? 'b' : 'w'

  // Status text
  const statusText =
    gamePhase === GAME_PHASE.ENDED
      ? endResult?.result === 'win'
        ? '🎉 You Won!'
        : endResult?.result === 'lose'
        ? '😔 You Lost'
        : '🤝 Draw'
      : isCheck
      ? '⚡ Check!'
      : isMyTurn
      ? '🟢 Your Turn'
      : '⏳ Opponent thinking...'

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <MainLayout>
      <div className="mx-auto px-2 sm:px-4 py-2">
        {/* ─── Header bar ─── */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={goToLobby}
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              title="Back to Lobby"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#81b64c]" />
                Ranked Game
              </h1>
              <p className="text-xs text-gray-500 font-mono">
                {matchId || 'demo-game'} · 10+0 · Rated
              </p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
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

            {/* Chess board — sized to fill available height */}
            <div
              className="my-1 w-full relative"
              style={{ maxWidth: 'calc(100vh - 180px)', margin: '4px auto' }}
            >
              <Chessboard
                position={fen}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                isDraggablePiece={isDraggable}
                boardOrientation={playerColor}
                customSquareStyles={squareStyles}
                customBoardStyle={{
                  borderRadius: '4px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#779952' }}
                customLightSquareStyle={{ backgroundColor: '#edeed1' }}
                animationDuration={200}
                showBoardNotation
                onPromotionCheck={() => false}
              />
              {/* Custom Promotion Dialog */}
              {promotionToSquare && (
                <div
                  className="absolute inset-0 z-50 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  onClick={handlePromotionCancel}
                >
                  <div
                    className="bg-[#312e2b] rounded-lg p-4 shadow-2xl border border-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-white text-sm mb-3 text-center font-medium">
                      Chọn quân để phong cấp
                    </p>
                    <div className="flex gap-2">
                      {['q', 'r', 'b', 'n'].map((piece) => {
                        const color = gameRef.current.turn() === 'w' ? 'w' : 'b'
                        const pieceSymbols = {
                          wq: '♕', wr: '♖', wb: '♗', wn: '♘',
                          bq: '♛', br: '♜', bb: '♝', bn: '♞',
                        }
                        const symbol = pieceSymbols[`${color}${piece}`]
                        const labels = { q: 'Hậu', r: 'Xe', b: 'Tượng', n: 'Mã' }
                        return (
                          <button
                            key={piece}
                            onClick={() => handlePromotionSelect(piece)}
                            className="flex flex-col items-center justify-center w-16 h-20 bg-[#454240] hover:bg-[#5a5654] rounded-lg transition-colors border border-gray-500 hover:border-yellow-400"
                            title={labels[piece]}
                          >
                            <span className="text-4xl leading-none" style={{ color: color === 'w' ? '#fff' : '#333' }}>
                              {symbol}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">{labels[piece]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
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
            className="w-full lg:flex-1 lg:min-w-[280px] flex flex-col bg-[#262421] rounded-lg border border-gray-700 overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* AFK Warning Banner */}
            {showAFKWarning && gamePhase === GAME_PHASE.PLAYING && (
              <div className="px-3 py-2 bg-red-900/40 border-b border-red-600/50 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-sm text-red-300 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Make a move! Auto-resign in {INACTIVITY_TIMEOUT_SEC - inactivityTime}s</span>
                </div>
              </div>
            )}

            {/* Opponent Disconnected Banner */}
            {opponentDisconnected && gamePhase === GAME_PHASE.PLAYING && (
              <div className="px-3 py-2 bg-yellow-900/30 border-b border-yellow-600/50">
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-300 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Opponent disconnected. Waiting for reconnect...</span>
                </div>
              </div>
            )}

            {/* Status strip */}
            <div
              className={`px-4 py-2 text-sm font-semibold text-center border-b border-gray-700 ${
                gamePhase === GAME_PHASE.ENDED
                  ? endResult?.result === 'win'
                    ? 'bg-green-900/30 text-green-300'
                    : endResult?.result === 'lose'
                    ? 'bg-red-900/30 text-red-300'
                    : 'bg-blue-900/30 text-blue-300'
                  : isCheck
                  ? 'bg-red-900/20 text-red-300'
                  : isMyTurn
                  ? 'bg-[#81b64c]/10 text-[#81b64c]'
                  : 'bg-gray-800 text-gray-400'
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
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
              <List className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Moves
              </span>
              <span className="text-xs text-gray-600 ml-auto">
                {moveHistory.length} moves
              </span>
            </div>

            {/* Move list */}
            <MoveListPanel moves={moveHistory} />

            {/* Game controls */}
            <div className="px-3 py-2 border-t border-gray-700 flex gap-2">
              <button
                onClick={handleResign}
                disabled={!playing}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  !playing
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : showResignConfirm
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-gray-700 hover:bg-red-600/80 text-gray-300 hover:text-white'
                }`}
              >
                {showResignConfirm ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                {showResignConfirm ? 'Confirm?' : 'Resign'}
              </button>

              <button
                onClick={handleOfferDraw}
                disabled={!playing || drawOffer !== null}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  !playing || drawOffer !== null
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-blue-600/80 text-gray-300 hover:text-white'
                }`}
              >
                <Handshake className="w-4 h-4" />
                {drawOffer === 'sent' ? 'Offer Sent' : 'Draw'}
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
