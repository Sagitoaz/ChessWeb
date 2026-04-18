import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import gameService, { replayAPI } from '@/services/gameService'
import { THEME } from '@/styles/theme'
import {
  ArrowRight,
  Bot,
  Flame,
  Swords,
  Trophy,
  Users,
  Zap,
  Target,
  BadgeCheck,
} from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000
const HEATMAP_DAYS = 30

const MODE_META = {
  ranked: {
    label: 'Rank',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  bot: {
    label: 'Bot',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  tournament: {
    label: 'Tournament',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  friendly: {
    label: 'Friendly',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

const QUICK_ACTIONS = [
  { to: '/ranked', label: 'Đấu Hạng', icon: Swords, color: 'bg-blue-600 hover:bg-blue-700' },
  { to: '/bot', label: 'Đấu Bot', icon: Bot, color: 'bg-violet-600 hover:bg-violet-700' },
  {
    to: '/tournaments',
    label: 'Giải Đấu',
    icon: Trophy,
    color: 'bg-amber-600 hover:bg-amber-700',
  },
  { to: '/rooms', label: 'Giao Hữu', icon: Users, color: 'bg-emerald-600 hover:bg-emerald-700' },
]

const toDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const relativeTime = (value) => {
  if (!value) return 'vừa xong'
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return 'vừa xong'

  const diffMin = Math.floor((Date.now() - ts) / 60000)
  if (diffMin < 1) return 'vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`

  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} ngày trước`
}

const normalizeMode = (rawMode, fallback = 'friendly') => {
  const value = String(rawMode || '').toLowerCase()
  if (value.includes('rank')) return 'ranked'
  if (value.includes('bot')) return 'bot'
  if (value.includes('tour')) return 'tournament'
  if (value.includes('room') || value.includes('friend') || value.includes('humanvshuman')) {
    return 'friendly'
  }
  return fallback
}

const normalizeResult = (rawResult, playerSide = null) => {
  const v = String(rawResult || '').toLowerCase()
  if (v === 'win' || v === 'lose' || v === 'loss' || v === 'draw') {
    return v === 'loss' ? 'lose' : v
  }
  if (v === 'whitewin' || v === 'white_win' || v === '1-0') {
    if (playerSide === 'white') return 'win'
    if (playerSide === 'black') return 'lose'
    return 'draw'
  }
  if (v === 'blackwin' || v === 'black_win' || v === '0-1') {
    if (playerSide === 'black') return 'win'
    if (playerSide === 'white') return 'lose'
    return 'draw'
  }
  return 'draw'
}

const resolvePlayerSide = (item, username) => {
  const explicit = String(item?.playerSide || item?.playerColor || '').toLowerCase()
  if (explicit === 'white' || explicit === 'black') return explicit

  if (!username) return null

  const whiteName = String(item?.whitePlayer?.username || '')
    .trim()
    .toLowerCase()
  const blackName = String(item?.blackPlayer?.username || '')
    .trim()
    .toLowerCase()
  const self = String(username).trim().toLowerCase()

  if (whiteName && self === whiteName) return 'white'
  if (blackName && self === blackName) return 'black'
  return null
}

const resolveOpponent = (item, username) => {
  const explicit =
    item?.opponent?.username || item?.opponentUsername || item?.opponentId || item?.opponent || null
  if (explicit) return explicit

  const white = item?.whitePlayer?.username || item?.whitePlayerId || 'White'
  const black = item?.blackPlayer?.username || item?.blackPlayerId || 'Black'

  if (!username) return `${white} vs ${black}`

  const self = String(username).toLowerCase()
  if (String(white).toLowerCase() === self) return black
  if (String(black).toLowerCase() === self) return white
  return `${white} vs ${black}`
}

const mergeMatches = ({ replayPayload, rankedPayload, username }) => {
  const merged = []

  const rankedMatches = Array.isArray(rankedPayload?.matches) ? rankedPayload.matches : []
  for (const item of rankedMatches) {
    merged.push({
      id: String(item.id || item.gameId || item._id || `ranked-${Math.random()}`),
      mode: 'ranked',
      result: normalizeResult(item.result, String(item.playerColor || '').toLowerCase() || null),
      opponent: item.opponent?.username || 'Đối thủ',
      playedAt: item.playedAt || item.finishedAt || item.createdAt || null,
      duration: Number(item.duration || 0),
      canAnalyze: Boolean(item.id || item.gameId || item._id),
    })
  }

  const replayGames = Array.isArray(replayPayload?.games)
    ? replayPayload.games
    : Array.isArray(replayPayload?.items)
      ? replayPayload.items
      : []

  for (const item of replayGames) {
    const mode = normalizeMode(item.mode)
    const side = resolvePlayerSide(item, username)
    merged.push({
      id: String(item.id || item.gameId || item._id || `replay-${Math.random()}`),
      mode,
      result: normalizeResult(item.result, side),
      opponent: resolveOpponent(item, username),
      playedAt: item.createdAt || item.playedAt || item.finishedAt || null,
      duration: Number(item.duration || item.durationSeconds || 0),
      canAnalyze: Boolean(item.id || item.gameId || item._id),
    })
  }

  const deduped = new Map()
  for (const item of merged) {
    const key = String(item.id)
    if (!deduped.has(key)) deduped.set(key, item)
  }

  return [...deduped.values()].sort((a, b) => {
    const aTs = new Date(a.playedAt || 0).getTime()
    const bTs = new Date(b.playedAt || 0).getTime()
    return bTs - aTs
  })
}

const calcWinStreak = (matches) => {
  let streak = 0
  for (const match of matches) {
    if (match.result !== 'win') break
    streak += 1
  }
  return streak
}

const calcHeatmap = (matches) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dailyMap = new Map()
  for (let i = 0; i < HEATMAP_DAYS; i += 1) {
    const date = new Date(today.getTime() - (HEATMAP_DAYS - 1 - i) * DAY_MS)
    const key = toDateKey(date)
    dailyMap.set(key, 0)
  }

  for (const match of matches) {
    const key = toDateKey(match.playedAt)
    if (!key || !dailyMap.has(key)) continue
    dailyMap.set(key, Number(dailyMap.get(key) || 0) + 1)
  }

  const cells = [...dailyMap.entries()].map(([date, count]) => ({ date, count }))
  const max = Math.max(...cells.map((cell) => cell.count), 1)
  return { cells, max }
}

const getHeatColor = (count, max) => {
  if (!count) return '#e5e7eb'
  const ratio = count / max
  if (ratio < 0.25) return '#bfdbfe'
  if (ratio < 0.5) return '#60a5fa'
  if (ratio < 0.75) return '#2563eb'
  return '#1e3a8a'
}

const StatCard = ({ icon: Icon, title, value, caption }) => (
  <div
    className={`${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className={`text-xs uppercase tracking-[0.14em] font-semibold ${THEME.text.muted}`}>
        {title}
      </p>
      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className={`text-3xl font-black ${THEME.text.primary}`}>{value}</p>
    <p className={`text-sm ${THEME.text.secondary} mt-1`}>{caption}</p>
  </div>
)

const MatchModeBadge = ({ mode }) => {
  const meta = MODE_META[mode] || MODE_META.friendly
  return (
    <span className={`px-2 py-1 text-xs rounded-full border font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

export default function DashboardPage() {
  const { user, hasHydrated } = useAuthStore()
  const token = useAuthStore((state) => state.token)
  const setAuthLogin = useAuthStore((state) => state.login)

  const [loading, setLoading] = useState(true)
  const [rankedStats, setRankedStats] = useState(null)
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!hasHydrated || !token) return

    let mounted = true

    const load = async () => {
      setLoading(true)

      const [profileResult, rankedResult, replayResult, rankedStatsResult] =
        await Promise.allSettled([
          authService.getCurrentUser(),
          gameService.getRankedHistory(1, 80),
          replayAPI.getGameHistory({ page: 1, pageSize: 120 }),
          gameService.getRankedStats(),
        ])

      if (!mounted) return

      const rankedHistory =
        rankedResult.status === 'fulfilled' ? rankedResult.value : { matches: [] }
      const replayHistory = replayResult.status === 'fulfilled' ? replayResult.value : { games: [] }
      const normalizedMatches = mergeMatches({
        replayPayload: replayHistory,
        rankedPayload: rankedHistory,
        username: user?.username,
      })
      setMatches(normalizedMatches)

      if (profileResult.status === 'fulfilled') {
        const profileData = profileResult.value?.data ?? profileResult.value
        const nextUser = profileData?.user ?? profileData
        if (nextUser && token) {
          const stats = rankedStatsResult.status === 'fulfilled' ? rankedStatsResult.value : null
          setAuthLogin(
            {
              ...nextUser,
              rating: Number(stats?.currentRating ?? nextUser.rating ?? 1200),
            },
            token
          )
        }
      }

      if (rankedStatsResult.status === 'fulfilled') {
        setRankedStats(rankedStatsResult.value)
      }

      setLoading(false)
    }

    void load()

    return () => {
      mounted = false
    }
  }, [hasHydrated, setAuthLogin, token, user?.username])

  const analytics = useMemo(() => {
    const totalGames = matches.length
    const wins = matches.filter((m) => m.result === 'win').length
    const losses = matches.filter((m) => m.result === 'lose').length
    const draws = matches.filter((m) => m.result === 'draw').length
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
    const winStreak = calcWinStreak(matches)
    const byMode = matches.reduce(
      (acc, match) => {
        const mode = normalizeMode(match.mode)
        acc[mode] += 1
        return acc
      },
      { ranked: 0, bot: 0, tournament: 0, friendly: 0 }
    )

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      winStreak,
      byMode,
    }
  }, [matches])

  const heatmap = useMemo(() => calcHeatmap(matches), [matches])
  const currentRating = Number(rankedStats?.currentRating ?? user?.rating ?? 1200)
  const recentMatches = matches.slice(0, 8)

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-sm text-gray-500">Đang tải Dashboard...</div>
      </div>
    )
  }

  return (
    <div className={`font-sans ${THEME.background.page} min-h-full py-6`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex items-center gap-4">
          <Avatar src={user?.avatarUrl} alt={user?.username} size="lg" />
          <div>
            <h1 className="text-3xl font-black text-gray-900">Dashboard Tổng Hợp</h1>
            <p className="text-gray-600">
              Chào {user?.displayName || user?.username || 'Kỳ thủ'}, đây là toàn cảnh tất cả trận
              của bạn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          <StatCard
            icon={Swords}
            title="Tổng ván đấu"
            value={analytics.totalGames}
            caption={`Rank ${analytics.byMode.ranked} · Bot ${analytics.byMode.bot} · Tournament ${analytics.byMode.tournament} · Friendly ${analytics.byMode.friendly}`}
          />
          <StatCard
            icon={BadgeCheck}
            title="Elo hiện tại"
            value={currentRating}
            caption={
              rankedStats?.peakRating ? `Peak ${rankedStats.peakRating}` : 'Xếp hạng hiện tại'
            }
          />
          <StatCard
            icon={Target}
            title="Tỷ lệ thắng"
            value={`${analytics.winRate}%`}
            caption={`${analytics.wins} thắng · ${analytics.losses} thua · ${analytics.draws} hòa`}
          />
          <StatCard
            icon={Flame}
            title="Chuỗi thắng"
            value={analytics.winStreak}
            caption={analytics.winStreak > 0 ? 'Đang thăng hoa' : 'Hãy bắt đầu chuỗi mới'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Activity Heatmap (30 ngày)</h2>
              <span className="text-sm text-gray-500">Mật độ chơi cờ theo ngày</span>
            </div>

            <div className="grid grid-cols-10 sm:grid-cols-15 gap-2">
              {heatmap.cells.map((cell) => (
                <div
                  key={cell.date}
                  className="aspect-square rounded-md border border-white/40"
                  style={{ backgroundColor: getHeatColor(cell.count, heatmap.max) }}
                  title={`${cell.date}: ${cell.count} trận`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span>Ít</span>
              <span className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(0, 4) }} />
              <span className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(1, 4) }} />
              <span className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(2, 4) }} />
              <span className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(3, 4) }} />
              <span className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(4, 4) }} />
              <span>Nhiều</span>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Lối tắt thi đấu</h3>
              <div className="space-y-3">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className={`${action.color} text-white rounded-lg px-4 py-3 flex items-center justify-between transition-colors`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tóm tắt nhanh</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng thắng</span>
                  <span className="font-bold text-green-600">{analytics.wins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng thua</span>
                  <span className="font-bold text-red-600">{analytics.losses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng hòa</span>
                  <span className="font-bold text-gray-700">{analytics.draws}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Chuỗi hiện tại</span>
                  <span className="font-bold text-indigo-700">{analytics.winStreak} W</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Matches</h2>
            <Link to="/replays" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Xem toàn bộ lịch sử
            </Link>
          </div>

          {recentMatches.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có trận nào để hiển thị.</p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match) => {
                const resultClass =
                  match.result === 'win'
                    ? 'text-green-600 bg-green-50'
                    : match.result === 'lose'
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-100'

                return (
                  <div
                    key={`${match.id}-${match.playedAt}`}
                    className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3 py-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <MatchModeBadge mode={match.mode} />
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${resultClass}`}>
                      {match.result.toUpperCase()}
                    </span>
                    <p className="text-sm text-gray-700 truncate">{match.opponent}</p>
                    <p className="text-xs text-gray-500">{relativeTime(match.playedAt)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
