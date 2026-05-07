import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import {
  History,
  ChevronLeft,
  ChevronRight,
  Swords,
  Search,
  Crown,
  Flag,
  Handshake,
  AlertTriangle,
  Timer,
  ArrowLeft,
  Eye,
  BarChart3,
} from 'lucide-react'
import { Button, Avatar, Loader } from '@components/common'
import { MainLayout } from '@components/layout'
import { useAuthStore } from '@store'
import gameService from '@services/gameService'
import { RANKS } from '@utils/constants'
import { formatEloDelta, eloDeltaColor, formatRelativeTime } from '@utils/formatters'
import { THEME } from '@/styles/theme'

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────
const PAGE_SIZE = 10

const RESULT_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'win', label: 'Thắng' },
  { value: 'loss', label: 'Thua' },
  { value: 'draw', label: 'Hòa' },
]

const END_REASON_ICONS = {
  checkmate: { icon: Crown, label: 'Chiếu hết', color: 'text-yellow-500' },
  resignation: { icon: Flag, label: 'Đầu hàng', color: 'text-red-500' },
  forfeit: { icon: Flag, label: 'Bỏ trận', color: 'text-red-500' },
  afk: { icon: AlertTriangle, label: 'AFK', color: 'text-orange-500' },
  timeout: { icon: Timer, label: 'Hết giờ', color: 'text-orange-500' },
  draw: { icon: Handshake, label: 'Hòa', color: 'text-blue-500' },
  draw_agreement: { icon: Handshake, label: 'Đồng ý hòa', color: 'text-blue-500' },
  stalemate: { icon: Handshake, label: 'Pat', color: 'text-gray-500' },
  completed: { icon: Swords, label: 'Kết thúc', color: 'text-gray-500' },
  aborted: { icon: AlertTriangle, label: 'Hủy trận', color: 'text-amber-500' },
  disconnect: { icon: AlertTriangle, label: 'Mất kết nối', color: 'text-amber-500' },
  unknown: { icon: Swords, label: 'Không rõ', color: 'text-gray-500' },
}

const RESULT_BADGE = {
  win: {
    label: 'WIN',
    bg: 'bg-green-600/20',
    text: 'text-green-400',
    border: 'border-green-600/30',
  },
  loss: { label: 'LOSS', bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600/30' },
  lose: { label: 'LOSS', bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600/30' },
  draw: {
    label: 'DRAW',
    bg: 'bg-blue-600/20',
    text: 'text-blue-400',
    border: 'border-blue-600/30',
  },
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const getRankInfo = (rating) => RANKS.find((r) => rating >= r.min && rating < r.max) || RANKS[0]

const toEndReasonInfo = (reason) => {
  const normalized = String(reason || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  if (!normalized) return END_REASON_ICONS.completed
  if (END_REASON_ICONS[normalized]) return END_REASON_ICONS[normalized]

  return {
    ...END_REASON_ICONS.unknown,
    label: normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

/** Format seconds → "M:SS" */
const fmtDuration = (secs) => {
  const safeSecs = Math.max(0, Math.floor(Number(secs) || 0))
  const m = Math.floor(safeSecs / 60)
  const s = safeSecs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Mock user

// ═════════════════════════════════════════════════════
// SUB-CMP: HistoryRow — a single match result card
// ═════════════════════════════════════════════════════
const HistoryRow = ({ match }) => {
  const badge = RESULT_BADGE[match.result] || RESULT_BADGE.draw
  const endInfo = toEndReasonInfo(match.endReason)
  const EndIcon = endInfo.icon
  const oppRank = getRankInfo(match.opponent.rating)

  return (
    <div
      className={`group grid grid-cols-1 sm:grid-cols-[72px_16px_minmax(0,1fr)_120px_80px_70px_96px_28px] items-center gap-3 px-4 py-3 rounded-xl ${THEME.background.card} border ${THEME.border.DEFAULT} hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 ${THEME.shadow.sm}`}
    >
      {/* Result badge */}
      <div
        className={`w-16 py-1 rounded-md text-center text-xs font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
      >
        {badge.label}
      </div>

      {/* Player color indicator */}
      <div
        className="flex-shrink-0 w-4 h-4 rounded-full border-2"
        style={{
          backgroundColor: match.playerColor === 'white' ? '#edeed1' : '#312e2b',
          borderColor: match.playerColor === 'white' ? '#b0b0b0' : '#555',
        }}
        title={`Played as ${match.playerColor}`}
      />

      {/* Opponent info */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={match.opponent.avatarUrl} alt={match.opponent.username} size="sm" />
        <div className="min-w-0">
          <p className={`font-semibold ${THEME.text.primary} text-sm truncate`} title={match.opponent.username}>
            {match.opponent.username}
          </p>
          <p className="text-xs" style={{ color: oppRank.color }}>
            {match.opponent.rating} · {oppRank.name}
          </p>
        </div>
      </div>

      {/* End reason */}
      <div className="hidden sm:flex items-center gap-1.5 min-w-[110px]">
        <EndIcon className={`w-3.5 h-3.5 ${endInfo.color}`} />
        <span className={`text-xs ${THEME.text.secondary}`}>{endInfo.label}</span>
      </div>

      {/* Moves / Duration */}
      <div className="hidden md:block text-center">
        <p className={`text-xs ${THEME.text.primary}`}>{match.moves} moves</p>
        <p className={`text-xs ${THEME.text.secondary}`}>{fmtDuration(match.duration)}</p>
      </div>

      {/* Rating change */}
      <div className="text-right">
        <p className={`font-mono font-bold text-sm ${eloDeltaColor(match.ratingChange)}`}>
          {formatEloDelta(match.ratingChange)}
        </p>
      </div>

      {/* Date */}
      <div className="hidden lg:block text-right">
        <p className={`text-xs ${THEME.text.secondary}`}>{formatRelativeTime(match.playedAt)}</p>
      </div>

      {/* View link */}
      <Link
        to={`/replays/${match.id}`}
        className={`p-1.5 rounded hover:bg-gray-100 ${THEME.text.secondary} hover:text-[#81b64c] transition-colors opacity-0 group-hover:opacity-100`}
        title="View replay"
      >
        <Eye className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: StatsStrip — summary bar at the top
// ═════════════════════════════════════════════════════
const StatsStrip = ({ matches }) => {
  const stats = useMemo(() => {
    const wins = matches.filter((m) => m.result === 'win').length
    const losses = matches.filter((m) => m.result === 'loss').length
    const draws = matches.filter((m) => m.result === 'draw').length
    const totalRatingChange = matches.reduce((sum, m) => sum + m.ratingChange, 0)
    return { wins, losses, draws, totalRatingChange }
  }, [matches])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div
        className={`${THEME.background.card} rounded-xl p-3 text-center border border-green-200 ${THEME.shadow.sm}`}
      >
        <p className={`text-xs ${THEME.text.secondary} mb-1`}>Wins</p>
        <p className="text-xl font-bold text-green-600">{stats.wins}</p>
      </div>
      <div
        className={`${THEME.background.card} rounded-xl p-3 text-center border border-red-200 ${THEME.shadow.sm}`}
      >
        <p className={`text-xs ${THEME.text.secondary} mb-1`}>Losses</p>
        <p className="text-xl font-bold text-red-600">{stats.losses}</p>
      </div>
      <div
        className={`${THEME.background.card} rounded-xl p-3 text-center border border-blue-200 ${THEME.shadow.sm}`}
      >
        <p className={`text-xs ${THEME.text.secondary} mb-1`}>Draws</p>
        <p className="text-xl font-bold text-blue-600">{stats.draws}</p>
      </div>
      <div
        className={`${THEME.background.card} rounded-xl p-3 text-center border ${THEME.border.DEFAULT} ${THEME.shadow.sm}`}
      >
        <p className={`text-xs ${THEME.text.secondary} mb-1`}>Net Rating</p>
        <p className={`text-xl font-bold ${eloDeltaColor(stats.totalRatingChange)}`}>
          {formatEloDelta(stats.totalRatingChange)}
        </p>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: Pagination
// ═════════════════════════════════════════════════════
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={`p-2 rounded hover:bg-gray-100 ${THEME.text.secondary} hover:${THEME.text.primary} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className={`w-8 h-8 rounded text-xs font-medium ${THEME.text.secondary} hover:bg-gray-100 hover:${THEME.text.primary} transition-colors`}
          >
            1
          </button>
          {start > 2 && <span className={`${THEME.text.muted} px-1`}>...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
            p === page
              ? 'bg-[#81b64c] text-white'
              : `${THEME.text.secondary} hover:bg-gray-100 hover:${THEME.text.primary}`
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className={`${THEME.text.muted} px-1`}>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className={`w-8 h-8 rounded text-xs font-medium ${THEME.text.secondary} hover:bg-gray-100 hover:${THEME.text.primary} transition-colors`}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={`p-2 rounded hover:bg-gray-100 ${THEME.text.secondary} hover:${THEME.text.primary} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// MAIN COMPONENT: RankedHistoryPage
// ═════════════════════════════════════════════════════
const RankedHistoryPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotification()
  const isDemo = location.pathname.startsWith('/demo')
  const storeUser = useAuthStore((s) => s.user)

  const user = useMemo(
    () =>
      storeUser
        ? {
            id: storeUser.id,
            username: storeUser.username,
            rating: storeUser.rating || 1200,
            avatarUrl: storeUser.avatarUrl || null,
          }
        : {
            id: '',
            username: 'Người chơi',
            rating: 1200,
            avatarUrl: null,
          },
    [storeUser]
  )

  // ─── Data ───
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  // ─── Pagination ───
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // ─── Filters ───
  const [resultFilter, setResultFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Fetch Data ───
  const fetchHistory = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const data = await gameService.getRankedHistory(page, PAGE_SIZE)
        setMatches(data.matches || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setCurrentPage(data.pagination?.page || page)
      } catch (err) {
        showNotification({
          type: 'error',
          title: 'Lỗi tải lịch sử',
          message: err?.message || 'Không thể tải lịch sử trận đấu.',
        })
        console.error('Failed to load history:', err)
      } finally {
        setLoading(false)
      }
    },
    [showNotification]
  )

  useEffect(() => {
    fetchHistory(currentPage)
  }, [currentPage, fetchHistory])

  // ─── Filtered matches ───
  const filteredMatches = useMemo(() => {
    let result = matches
    if (resultFilter !== 'all') {
      result = result.filter((m) => m.result === resultFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) => m.opponent.username.toLowerCase().includes(q))
    }
    return result
  }, [matches, resultFilter, searchQuery])

  // ─── Page change handler ───
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // ─── Summary stats for current page ───
  const rank = getRankInfo(user.rating)

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        {/* ─── Header ─── */}
        <div className="ui-surface ui-card-padding flex items-center gap-4 mb-5">
          <button
            onClick={() => navigate(isDemo ? '/demo/ranked' : '/ranked')}
            className={`p-2 rounded-lg hover:bg-gray-100 ${THEME.text.secondary} hover:${THEME.text.primary} transition-colors`}
            title="Back to Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${THEME.text.primary} flex items-center gap-3`}>
              <History className="w-6 h-6 text-[#81b64c]" />
              Lịch sử đấu hạng
            </h1>
            <p className={`text-sm ${THEME.text.secondary} mt-0.5`}>
              Theo dõi kết quả, lý do kết thúc và thay đổi ELO theo từng trận
            </p>
          </div>
          <div
            className={`hidden sm:flex items-center gap-2 ${THEME.background.card} rounded-xl px-3 py-2 border ${THEME.border.DEFAULT}`}
          >
            <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
            <div>
              <p className={`text-sm font-semibold ${THEME.text.primary}`}>{user.username}</p>
              <p className="text-xs" style={{ color: rank.color }}>
                {user.rating} · {rank.name}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Stats Strip ─── */}
        {!loading && matches.length > 0 && <StatsStrip matches={matches} />}

        {/* ─── Filters Bar ─── */}
        <div className="ui-surface ui-card-padding flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Result filter tabs */}
          <div
            className={`flex ${THEME.background.card} rounded-lg p-1 border ${THEME.border.DEFAULT}`}
          >
            {RESULT_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setResultFilter(f.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  resultFilter === f.value
                    ? 'bg-[#81b64c] text-white'
                    : `${THEME.text.secondary} hover:${THEME.text.primary} hover:bg-gray-100`
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${THEME.text.muted}`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đối thủ..."
              className={`w-full ${THEME.background.card} border ${THEME.border.DEFAULT} rounded-lg pl-9 pr-4 py-2 text-sm ${THEME.text.primary} placeholder:${THEME.text.muted} focus:outline-none focus:border-[#81b64c]/50 transition-colors`}
            />
          </div>

          {/* Link to stats */}
          <Link
            to={isDemo ? '/demo/ranked/stats' : '/ranked/stats'}
            className={`flex items-center gap-2 px-4 py-2 ${THEME.background.card} border ${THEME.border.DEFAULT} rounded-lg text-sm ${THEME.text.secondary} hover:text-[#81b64c] hover:border-[#81b64c]/30 transition-colors`}
          >
            <BarChart3 className="w-4 h-4" />
            Thống kê
          </Link>
        </div>

        {/* ─── Table Header ─── */}
        <div
          className={`hidden sm:grid sm:grid-cols-[72px_16px_minmax(0,1fr)_120px_80px_70px_96px_28px] items-center gap-3 px-4 py-2 text-xs ${THEME.text.secondary} uppercase tracking-wider font-semibold mb-1`}
        >
          <div className="text-center">KQ</div>
          <div />
          <div>Đối thủ</div>
          <div>Lý do kết thúc</div>
          <div className="text-center">Nước đi</div>
          <div className="text-right">ELO</div>
          <div className="text-right">Thời gian</div>
          <div />
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader size="lg" />
            <p className={`${THEME.text.secondary} mt-4 text-sm`}>Loading history...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <Swords className={`w-12 h-12 ${THEME.text.secondary} mx-auto mb-4`} />
            <h3 className={`text-lg font-semibold ${THEME.text.primary} mb-2`}>
              {matches.length === 0 ? 'No games played yet' : 'No matches found'}
            </h3>
            <p className={`${THEME.text.secondary} text-sm mb-6`}>
              {matches.length === 0
                ? 'Play your first ranked game to see results here.'
                : 'Try changing the filter or search query.'}
            </p>
            {matches.length === 0 && (
              <Button
                onClick={() => navigate(isDemo ? '/demo/ranked' : '/ranked')}
                className="gap-2 bg-[#81b64c] hover:bg-[#6a9a3f] text-white"
              >
                <Swords className="w-4 h-4" />
                Find a Match
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMatches.map((match) => (
              <HistoryRow key={match.id} match={match} />
            ))}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {!loading && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        )}

        {/* ─── Bottom info ─── */}
        {!loading && matches.length > 0 && (
          <p className={`text-center text-xs ${THEME.text.secondary} mt-4`}>
            Trang {currentPage}/{totalPages} · {PAGE_SIZE} trận mỗi trang
          </p>
        )}
      </div>
    </MainLayout>
  )
}

export default RankedHistoryPage
