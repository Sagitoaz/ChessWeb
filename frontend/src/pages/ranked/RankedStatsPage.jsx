import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  BarChart3,
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Zap,
  Clock,
  Users,
  ArrowLeft,
  History,
  Swords,
  Award,
  Activity,
  Percent,
  Star,
} from 'lucide-react'
import { Avatar, Loader } from '@components/common'
import { MainLayout } from '@components/layout'
import { useAuthStore } from '@store'
import gameService from '@services/gameService'
import { RANKS } from '@utils/constants'
import { THEME } from '@/styles/theme'

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const getRankInfo = (rating) =>
  RANKS.find((r) => rating >= r.min && rating < r.max) || RANKS[0]

const MOCK_USER = {
  id: 'player-1',
  username: 'ChessPlayer',
  rating: 1523,
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
}

/** Generate mock rating history (last 30 games) */
const generateRatingHistory = (currentRating) => {
  const points = []
  let r = currentRating - 80 + Math.floor(Math.random() * 40)
  for (let i = 0; i < 30; i++) {
    r += Math.floor(Math.random() * 30) - 12
    r = Math.max(800, Math.min(2400, r))
    points.push({ game: i + 1, rating: r })
  }
  points[points.length - 1].rating = currentRating
  return points
}

/** Generate mock monthly performance data */
const generateMonthlyPerf = () => {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  return months.map((m) => ({
    month: m,
    wins: Math.floor(Math.random() * 15) + 5,
    losses: Math.floor(Math.random() * 12) + 3,
    draws: Math.floor(Math.random() * 6),
  }))
}

// ═════════════════════════════════════════════════════
// SUB-CMP: StatCard — reusable stat display card
// ═════════════════════════════════════════════════════
const StatCard = ({ icon: Icon, label, value, subValue, iconColor = 'text-[#81b64c]', valueColor }) => (
  <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} hover:border-gray-300 transition-colors ${THEME.shadow.DEFAULT}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className={`text-xs ${THEME.text.secondary} uppercase tracking-wider font-semibold`}>
        {label}
      </span>
    </div>
    <p className={`text-2xl font-bold ${valueColor || THEME.text.primary}`}>{value}</p>
    {subValue && <p className={`text-xs ${THEME.text.muted} mt-0.5`}>{subValue}</p>}
  </div>
)

// ═════════════════════════════════════════════════════
// SUB-CMP: MiniRatingChart — SVG line chart of rating
// ═════════════════════════════════════════════════════
const MiniRatingChart = ({ data }) => {
  if (!data || data.length === 0) return null

  const width = 600
  const height = 200
  const pad = { t: 20, r: 20, b: 30, l: 50 }
  const chartW = width - pad.l - pad.r
  const chartH = height - pad.t - pad.b

  const minR = Math.min(...data.map((d) => d.rating)) - 20
  const maxR = Math.max(...data.map((d) => d.rating)) + 20

  const x = (i) => pad.l + (i / (data.length - 1)) * chartW
  const y = (r) => pad.t + ((maxR - r) / (maxR - minR)) * chartH

  // SVG path
  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.rating).toFixed(1)}`)
    .join(' ')

  // Gradient area under the line
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${(pad.t + chartH).toFixed(1)} L ${pad.l.toFixed(1)} ${(pad.t + chartH).toFixed(1)} Z`

  // Y-axis tick marks
  const yTicks = 5
  const tickStep = (maxR - minR) / yTicks
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minR + i * tickStep),
  )

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            y1={y(t)}
            x2={width - pad.r}
            y2={y(t)}
            stroke="#333"
            strokeWidth="0.5"
          />
          <text
            x={pad.l - 8}
            y={y(t) + 4}
            textAnchor="end"
            fill="#666"
            fontSize="10"
            fontFamily="monospace"
          >
            {t}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#81b64c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#81b64c" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />

      {/* Line */}
      <path d={line} fill="none" stroke="#81b64c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(d.rating)}
          r={i === data.length - 1 ? 5 : 2.5}
          fill={i === data.length - 1 ? '#81b64c' : '#fff'}
          stroke={i === data.length - 1 ? '#fff' : '#81b64c'}
          strokeWidth={i === data.length - 1 ? 2 : 1}
        />
      ))}

      {/* Current rating label */}
      <text
        x={x(data.length - 1)}
        y={y(data[data.length - 1].rating) - 12}
        textAnchor="middle"
        fill="#81b64c"
        fontSize="12"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {data[data.length - 1].rating}
      </text>

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        fill="#555"
        fontSize="10"
      >
        Last {data.length} games
      </text>
    </svg>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: WinRateDonut — circular percentage chart
// ═════════════════════════════════════════════════════
const WinRateDonut = ({ wins, losses, draws, total }) => {
  const r = 60
  const cx = 80
  const cy = 80
  const stroke = 14
  const C = 2 * Math.PI * r

  const winPct = total > 0 ? wins / total : 0
  const losePct = total > 0 ? losses / total : 0
  const drawPct = total > 0 ? draws / total : 0

  const winLen = C * winPct
  const loseLen = C * losePct
  const drawLen = C * drawPct

  const winOffset = 0
  const loseOffset = -winLen
  const drawOffset = -(winLen + loseLen)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="w-40 h-40">
        {/* Background */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#333" strokeWidth={stroke} />

        {/* Draws */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={stroke}
          strokeDasharray={`${drawLen} ${C - drawLen}`}
          strokeDashoffset={drawOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Losses */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#EF4444"
          strokeWidth={stroke}
          strokeDasharray={`${loseLen} ${C - loseLen}`}
          strokeDashoffset={loseOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Wins */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#22C55E"
          strokeWidth={stroke}
          strokeDasharray={`${winLen} ${C - winLen}`}
          strokeDashoffset={winOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">
          {total > 0 ? Math.round(winPct * 100) : 0}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#999" fontSize="10">
          Win Rate
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className={`text-xs ${THEME.text.secondary}`}>{wins}W</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className={`text-xs ${THEME.text.secondary}`}>{losses}L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className={`text-xs ${THEME.text.secondary}`}>{draws}D</span>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: MonthlyPerfChart — bar chart for monthly W/L/D
// ═════════════════════════════════════════════════════
const MonthlyPerfChart = ({ data }) => {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map((d) => d.wins + d.losses + d.draws))

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((d) => {
        const total = d.wins + d.losses + d.draws
        const wH = maxVal > 0 ? (d.wins / maxVal) * 100 : 0
        const lH = maxVal > 0 ? (d.losses / maxVal) * 100 : 0
        const dH = maxVal > 0 ? (d.draws / maxVal) * 100 : 0

        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            {/* Stacked bar */}
            <div className="w-full flex flex-col-reverse items-center" style={{ height: '100px' }}>
              <div
                className="w-6 rounded-t-sm bg-green-500"
                style={{ height: `${wH}%` }}
                title={`${d.wins} wins`}
              />
              <div
                className="w-6 bg-red-500"
                style={{ height: `${lH}%` }}
                title={`${d.losses} losses`}
              />
              <div
                className="w-6 rounded-t-sm bg-blue-500"
                style={{ height: `${dH}%` }}
                title={`${d.draws} draws`}
              />
            </div>
            {/* Label */}
            <span className="text-xs text-gray-500">{d.month}</span>
            <span className="text-xs text-gray-600">{total}</span>
          </div>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════
// SUB-CMP: RankProgressBar
// ═════════════════════════════════════════════════════
const RankProgressBar = ({ rating }) => {
  const rank = getRankInfo(rating)
  const nextRank = RANKS[RANKS.indexOf(rank) + 1]
  const prevMin = rank.min
  const nextMin = nextRank ? nextRank.min : rank.max
  const progress = ((rating - prevMin) / (nextMin - prevMin)) * 100

  return (
    <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} ${THEME.shadow.DEFAULT}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" style={{ color: rank.color }} />
          <span className="text-sm font-bold" style={{ color: rank.color }}>
            {rank.name}
          </span>
        </div>
        {nextRank && (
          <span className={`text-xs ${THEME.text.muted}`}>
            Next: <span style={{ color: nextRank.color }}>{nextRank.name}</span> ({nextRank.min})
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, progress)}%`,
            backgroundColor: rank.color,
            boxShadow: `0 0 8px ${rank.color}40`,
          }}
        />
      </div>

      <div className={`flex justify-between text-xs ${THEME.text.muted}`}>
        <span>{prevMin}</span>
        <span className={`font-mono font-bold ${THEME.text.primary}`}>{rating}</span>
        <span>{nextMin === Infinity ? '∞' : nextMin}</span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════
// MAIN COMPONENT: RankedStatsPage
// ═════════════════════════════════════════════════════
const RankedStatsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isDemo = location.pathname.startsWith('/demo')
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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─── Mock chart data ───
  const ratingHistory = useMemo(() => generateRatingHistory(user.rating), [user.rating])
  const monthlyPerf = useMemo(() => generateMonthlyPerf(), [])

  // ─── Fetch stats ───
  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await gameService.getRankedStats()
      setStats(data)
    } catch (err) {
      setError('Không thể tải thống kê.')
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const rank = getRankInfo(user.rating)

  // ─── Loading / Error ───
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader size="lg" />
          <p className={`${THEME.text.secondary} text-sm`}>Loading stats...</p>
        </div>
      </MainLayout>
    )
  }

  if (error || !stats) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-red-400">{error || 'Something went wrong'}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[#81b64c] hover:bg-[#6a9a3f] text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ─── Header ─── */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(isDemo ? '/demo/ranked' : '/ranked')}
            className={`p-2 rounded-lg hover:bg-gray-100 ${THEME.text.secondary} hover:${THEME.text.primary} transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${THEME.text.primary} flex items-center gap-3`}>
              <BarChart3 className="w-6 h-6 text-[#81b64c]" />
              Ranked Statistics
            </h1>
            <p className={`text-sm ${THEME.text.secondary} mt-0.5`}>
              Detailed performance analysis and progression
            </p>
          </div>
          <Link
            to={isDemo ? '/demo/ranked/history' : '/ranked/history'}
            className={`flex items-center gap-2 px-4 py-2 ${THEME.background.card} border ${THEME.border.DEFAULT} rounded-lg text-sm ${THEME.text.secondary} hover:text-[#81b64c] hover:border-[#81b64c]/30 transition-colors`}
          >
            <History className="w-4 h-4" />
            History
          </Link>
        </div>

        {/* ─── Player Profile Strip ─── */}
        <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} mb-6 ${THEME.shadow.DEFAULT}`}>
          <div className="flex items-center gap-4">
            <Avatar src={user.avatarUrl} alt={user.username} size="lg" />
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${THEME.text.primary}`}>{user.username}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="text-lg font-mono font-bold"
                  style={{ color: rank.color }}
                >
                  {stats.currentRating}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-semibold"
                  style={{
                    color: rank.color,
                    backgroundColor: `${rank.color}20`,
                  }}
                >
                  {rank.name}
                </span>
                <span className="text-xs text-gray-500">
                  Peak: {stats.peakRating}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{stats.gamesPlayed}</p>
                <p className="text-xs text-gray-500">Games</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                <p className="text-xs text-gray-500">Losses</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Rank Progress ─── */}
        <div className="mb-6">
          <RankProgressBar rating={stats.currentRating} />
        </div>

        {/* ─── Stats Grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard
            icon={Trophy}
            label="Games"
            value={stats.gamesPlayed}
            iconColor="text-yellow-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Wins"
            value={stats.wins}
            valueColor="text-green-400"
            iconColor="text-green-400"
          />
          <StatCard
            icon={TrendingDown}
            label="Losses"
            value={stats.losses}
            valueColor="text-red-400"
            iconColor="text-red-400"
          />
          <StatCard
            icon={Percent}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            iconColor="text-blue-400"
          />
          <StatCard
            icon={Flame}
            label="Streak"
            value={stats.currentStreak}
            subValue={`Best: ${stats.bestStreak}`}
            iconColor="text-orange-400"
          />
          <StatCard
            icon={Users}
            label="Avg Opp"
            value={stats.avgOpponentRating}
            iconColor="text-purple-400"
          />
        </div>

        {/* ─── Charts Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Rating History Chart (2 cols) */}
          <div className={`lg:col-span-2 ${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} ${THEME.shadow.sm}`}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#81b64c]" />
              <h3 className={`text-sm font-semibold ${THEME.text.primary} uppercase tracking-wider`}>
                Rating History
              </h3>
            </div>
            <MiniRatingChart data={ratingHistory} />
          </div>

          {/* Win Rate Donut (1 col) */}
          <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} ${THEME.shadow.sm} flex flex-col items-center justify-center`}>
            <div className="flex items-center gap-2 mb-4 self-start">
              <Target className="w-4 h-4 text-[#81b64c]" />
              <h3 className={`text-sm font-semibold ${THEME.text.primary} uppercase tracking-wider`}>
                Win Distribution
              </h3>
            </div>
            <WinRateDonut
              wins={stats.wins}
              losses={stats.losses}
              draws={stats.draws}
              total={stats.gamesPlayed}
            />
          </div>
        </div>

        {/* ─── Monthly Performance ─── */}
        <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} ${THEME.shadow.sm} mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#81b64c]" />
            <h3 className={`text-sm font-semibold ${THEME.text.primary} uppercase tracking-wider`}>
              Monthly Performance
            </h3>
          </div>
          <MonthlyPerfChart data={monthlyPerf} />
          <div className="flex justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className={`text-xs ${THEME.text.secondary}`}>Wins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className={`text-xs ${THEME.text.secondary}`}>Losses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className={`text-xs ${THEME.text.secondary}`}>Draws</span>
            </div>
          </div>
        </div>

        {/* ─── Time Controls ─── */}
        <div className={`${THEME.background.card} rounded-lg p-4 border ${THEME.border.DEFAULT} ${THEME.shadow.sm} mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#81b64c]" />
            <h3 className={`text-sm font-semibold ${THEME.text.primary} uppercase tracking-wider`}>
              Time Controls
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(stats.timeControls).map(([mode, data]) => {
              const modeIcons = { blitz: Zap, rapid: Clock, classical: Star }
              const ModeIcon = modeIcons[mode] || Clock

              return (
                <div
                  key={mode}
                  className={`flex items-center gap-3 ${THEME.background.card} rounded-lg p-3 border ${THEME.border.DEFAULT}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ModeIcon className="w-5 h-5 text-[#81b64c]" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${THEME.text.primary} capitalize`}>
                      {mode}
                    </p>
                    <p className={`text-xs ${THEME.text.secondary}`}>
                      {data.games} games · {data.rating} Elo
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Bottom Actions ─── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(isDemo ? '/demo/ranked' : '/ranked')}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#81b64c] hover:bg-[#6a9a3f] text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Swords className="w-4 h-4" />
            Play Ranked
          </button>
          <Link
            to={isDemo ? '/demo/ranked/history' : '/ranked/history'}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 ${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.text.secondary} hover:${THEME.text.primary} hover:border-gray-400 rounded-lg font-medium text-sm transition-colors`}
          >
            <History className="w-4 h-4" />
            Match History
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}

export default RankedStatsPage
