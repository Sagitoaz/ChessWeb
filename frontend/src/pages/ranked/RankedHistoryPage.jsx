import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  History,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Clock,
  Swords,
  Filter,
  Search,
  Crown,
  Flag,
  Handshake,
  Timer,
  ArrowLeft,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react'
import { Button, Avatar, Loader } from '@components/common'
import { MainLayout } from '@components/layout'
import { useAuthStore } from '@store'
import gameService from '@services/gameService'
import { RANKS } from '@utils/constants'
import {
  formatEloDelta,
  eloDeltaColor,
  formatRelativeTime,
  formatDate,
} from '@utils/formatters'

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────
const PAGE_SIZE = 10

const RESULT_FILTERS = [
  { value: 'all', label: 'All Results' },
  { value: 'win', label: 'Wins' },
  { value: 'loss', label: 'Losses' },
  { value: 'draw', label: 'Draws' },
]

const END_REASON_ICONS = {
  checkmate: { icon: Crown, label: 'Checkmate', color: 'text-yellow-400' },
  resignation: { icon: Flag, label: 'Resignation', color: 'text-red-400' },
  timeout: { icon: Timer, label: 'Timeout', color: 'text-orange-400' },
  draw: { icon: Handshake, label: 'Draw', color: 'text-blue-400' },
  stalemate: { icon: Handshake, label: 'Stalemate', color: 'text-gray-400' },
}

const RESULT_BADGE = {
  win: { label: 'WIN', bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-600/30' },
  loss: { label: 'LOSS', bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600/30' },
  draw: { label: 'DRAW', bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30' },
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const getRankInfo = (rating) =>
  RANKS.find((r) => rating >= r.min && rating < r.max) || RANKS[0]

/** Format seconds → "M:SS" */
const fmtDuration = (secs) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Mock user
const MOCK_USER = {
  id: 'player-1',
  username: 'ChessPlayer',
  rating: 1523,
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
}

// ═════════════════════════════════════════════════════
// SUB-CMP: HistoryRow — a single match result card
// ═════════════════════════════════════════════════════
const HistoryRow = ({ match }) => {
  const badge = RESULT_BADGE[match.result] || RESULT_BADGE.draw
  const endInfo = END_REASON_ICONS[match.endReason] || END_REASON_ICONS.draw
  const EndIcon = endInfo.icon
  const oppRank = getRankInfo(match.opponent.rating)

  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-lg bg-[#262421] border border-transparent hover:border-gray-600/50 transition-all duration-200">
      {/* Result badge */}
      <div
        className={`flex-shrink-0 w-16 py-1 rounded text-center text-xs font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
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
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar src={match.opponent.avatarUrl} alt={match.opponent.username} size="sm" />
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">
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
        <span className="text-xs text-gray-400">{endInfo.label}</span>
      </div>

      {/* Moves / Duration */}
      <div className="hidden md:block text-center min-w-[70px]">
        <p className="text-xs text-gray-300">{match.moves} moves</p>
        <p className="text-xs text-gray-500">{fmtDuration(match.duration)}</p>
      </div>

      {/* Rating change */}
      <div className="min-w-[60px] text-right">
        <p className={`font-mono font-bold text-sm ${eloDeltaColor(match.ratingChange)}`}>
          {formatEloDelta(match.ratingChange)}
        </p>
      </div>

      {/* Date */}
      <div className="hidden lg:block min-w-[90px] text-right">
        <p className="text-xs text-gray-500">{formatRelativeTime(match.playedAt)}</p>
      </div>

      {/* View link */}
      <Link
        to={`/replays/${match.id}`}
        className="flex-shrink-0 p-1.5 rounded hover:bg-gray-700/50 text-gray-500 hover:text-[#81b64c] transition-colors opacity-0 group-hover:opacity-100"
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-[#262421] rounded-lg p-3 text-center border border-green-800/30">
        <p className="text-xs text-gray-400 mb-1">Wins</p>
        <p className="text-xl font-bold text-green-400">{stats.wins}</p>
      </div>
      <div className="bg-[#262421] rounded-lg p-3 text-center border border-red-800/30">
        <p className="text-xs text-gray-400 mb-1">Losses</p>
        <p className="text-xl font-bold text-red-400">{stats.losses}</p>
      </div>
      <div className="bg-[#262421] rounded-lg p-3 text-center border border-blue-800/30">
        <p className="text-xs text-gray-400 mb-1">Draws</p>
        <p className="text-xl font-bold text-blue-400">{stats.draws}</p>
      </div>
      <div className="bg-[#262421] rounded-lg p-3 text-center border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Net Rating</p>
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
        className="p-2 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-8 h-8 rounded text-xs font-medium text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            1
          </button>
          {start > 2 && <span className="text-gray-600 px-1">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
            p === page
              ? 'bg-[#81b64c] text-white'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="text-gray-600 px-1">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-8 h-8 rounded text-xs font-medium text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
  const storeUser = useAuthStore((s) => s.user)

  const user = useMemo(
    () =>
      storeUser
        ? {
            id: storeUser.id,
            username: storeUser.username,
            rating: storeUser.rating || MOCK_USER.rating,
            avatarUrl: storeUser.avatarUrl || MOCK_USER.avatarUrl,
          }
        : MOCK_USER,
    [storeUser],
  )

  // ─── Data ───
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─── Pagination ───
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // ─── Filters ───
  const [resultFilter, setResultFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Fetch Data ───
  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await gameService.getRankedHistory(page, PAGE_SIZE)
      setMatches(data.matches)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(data.pagination.page)
    } catch (err) {
      setError('Không thể tải lịch sử trận đấu.')
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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
      result = result.filter((m) =>
        m.opponent.username.toLowerCase().includes(q),
      )
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
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ─── Header ─── */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/demo/ranked')}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Back to Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <History className="w-6 h-6 text-[#81b64c]" />
              Match History
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              View your ranked game results and replay past matches
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#262421] rounded-lg px-3 py-2 border border-gray-700">
            <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
            <div>
              <p className="text-sm font-semibold text-white">{user.username}</p>
              <p className="text-xs" style={{ color: rank.color }}>
                {user.rating} · {rank.name}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Stats Strip ─── */}
        {!loading && matches.length > 0 && <StatsStrip matches={matches} />}

        {/* ─── Filters Bar ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Result filter tabs */}
          <div className="flex bg-[#262421] rounded-lg p-1 border border-gray-700">
            {RESULT_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setResultFilter(f.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  resultFilter === f.value
                    ? 'bg-[#81b64c] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opponent..."
              className="w-full bg-[#262421] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#81b64c]/50 transition-colors"
            />
          </div>

          {/* Link to stats */}
          <Link
            to="/demo/ranked/stats"
            className="flex items-center gap-2 px-4 py-2 bg-[#262421] border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-[#81b64c] hover:border-[#81b64c]/30 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </Link>
        </div>

        {/* ─── Table Header ─── */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
          <div className="w-16 text-center">Result</div>
          <div className="w-4" />
          <div className="flex-1">Opponent</div>
          <div className="hidden sm:block w-[110px]">End Reason</div>
          <div className="hidden md:block w-[70px] text-center">Detail</div>
          <div className="w-[60px] text-right">Rating</div>
          <div className="hidden lg:block w-[90px] text-right">Date</div>
          <div className="w-[30px]" />
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader size="lg" />
            <p className="text-gray-400 mt-4 text-sm">Loading history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => fetchHistory(currentPage)} className="gap-2">
              Retry
            </Button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <Swords className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {matches.length === 0
                ? 'No games played yet'
                : 'No matches found'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {matches.length === 0
                ? 'Play your first ranked game to see results here.'
                : 'Try changing the filter or search query.'}
            </p>
            {matches.length === 0 && (
              <Button
                onClick={() => navigate('/demo/ranked')}
                className="gap-2 bg-[#81b64c] hover:bg-[#6a9a3f] text-white"
              >
                <Swords className="w-4 h-4" />
                Find a Match
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredMatches.map((match) => (
              <HistoryRow key={match.id} match={match} />
            ))}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {!loading && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}

        {/* ─── Bottom info ─── */}
        {!loading && matches.length > 0 && (
          <p className="text-center text-xs text-gray-600 mt-4">
            Showing page {currentPage} of {totalPages} · {PAGE_SIZE} matches per page
          </p>
        )}
      </div>
    </MainLayout>
  )
}

export default RankedHistoryPage
