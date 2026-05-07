import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import gameService from '@/services/gameService'
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
    label: 'Đấu hạng',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  bot: {
    label: 'Đấu Bot',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  tournament: {
    label: 'Giải đấu',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  friendly: {
    label: 'Giao hữu',
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

const normalizeHistoryPayload = (payload, username) => {
  const data = payload?.data ?? payload ?? {}
  const items = Array.isArray(data.items) ? data.items : []
  const games = Array.isArray(data.games) ? data.games : []
  const gamesById = new Map(games.map((item) => [String(item.id), item]))

  return items
    .map((item) => {
      const replay = gamesById.get(String(item.gameId)) || gamesById.get(String(item.id)) || null
      const mode = normalizeMode(item.mode || replay?.mode)
      const opponent =
        replay?.whitePlayer?.username && replay?.blackPlayer?.username
          ? replay.whitePlayer.username === username
            ? replay.blackPlayer.username
            : replay.blackPlayer.username === username
              ? replay.whitePlayer.username
              : `${replay.whitePlayer.username} vs ${replay.blackPlayer.username}`
          : item.playerSide === 'white'
            ? replay?.blackPlayer?.username || 'Đối thủ'
            : item.playerSide === 'black'
              ? replay?.whitePlayer?.username || 'Đối thủ'
              : replay?.whitePlayer?.username || replay?.blackPlayer?.username || 'Đối thủ'

      return {
        id: String(item.gameId || item.id || replay?.id || item._id || Math.random()),
        mode,
        result: normalizeResult(item.result, item.playerSide || null),
        opponent,
        playedAt: item.finishedAt || item.createdAt || replay?.createdAt || null,
        duration: Number(
          replay?.metadata?.totalMoves || item.duration || item.durationSeconds || 0
        ),
        canAnalyze: Boolean(item.gameId || item.id || replay?.id || item._id),
      }
    })
    .sort((a, b) => new Date(b.playedAt || 0) - new Date(a.playedAt || 0))
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
  <div className="ui-surface ui-card-padding transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between mb-3">
      <p className={`text-[11px] uppercase tracking-[0.14em] font-semibold ${THEME.text.muted}`}>
        {title}
      </p>
      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className={`text-3xl font-extrabold leading-none ${THEME.text.primary}`}>{value}</p>
    <p className={`text-sm ${THEME.text.secondary} mt-1`}>{caption}</p>
  </div>
)

const MatchModeBadge = ({ mode }) => {
  const meta = MODE_META[mode] || MODE_META.friendly
  return (
    <span className={`px-2.5 py-1 text-[11px] rounded-full border font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

export default function DashboardPage() {
  const { user, hasHydrated } = useAuthStore()
  const token = useAuthStore((state) => state.token)
  const setAuthLogin = useAuthStore((state) => state.login)
  const currentUsername = user?.username
  const currentUserId = user?.id || user?.userId || user?._id || user?.sub
  const hasAvatarUrl = typeof user?.avatarUrl === 'string' && user.avatarUrl.trim().length > 0

  const [loading, setLoading] = useState(true)
  const [rankedStats, setRankedStats] = useState(null)
  const [matches, setMatches] = useState([])
  const loadSeqRef = useRef(0)

  useEffect(() => {
    if (!hasHydrated || !token) return

    let mounted = true
    const requestSeq = loadSeqRef.current + 1
    loadSeqRef.current = requestSeq

    const load = async () => {
      setLoading(true)
      try {
        const storeUser = useAuthStore.getState().user
        const profileTask =
          currentUserId && hasAvatarUrl
            ? Promise.resolve({ user: storeUser })
            : authService.getCurrentUser()

        const [profileResult, gamesResult, rankedStatsResult] = await Promise.allSettled([
          profileTask,
          gameService.getAllUserGames(),
          gameService.getRankedStats(),
        ])

        if (!mounted || loadSeqRef.current !== requestSeq) return

        const gamesHistory = gamesResult.status === 'fulfilled' ? gamesResult.value : { items: [] }
        setMatches(normalizeHistoryPayload(gamesHistory, currentUsername))

        if (profileResult.status === 'fulfilled') {
          const profileData = profileResult.value?.data ?? profileResult.value
          const nextUser = profileData?.user ?? profileData
          if (nextUser && token) {
            const stats = rankedStatsResult.status === 'fulfilled' ? rankedStatsResult.value : null
            const mergedUser = {
              ...nextUser,
              rating: Number(stats?.currentRating ?? nextUser.rating ?? 1200),
            }
            const currentStoreUser = useAuthStore.getState().user
            const shouldSyncUser =
              !currentStoreUser ||
              currentStoreUser.id !== mergedUser.id ||
              currentStoreUser.username !== mergedUser.username ||
              Number(currentStoreUser.rating ?? 0) !== Number(mergedUser.rating ?? 0) ||
              Number(currentStoreUser.gamesPlayed ?? 0) !== Number(mergedUser.gamesPlayed ?? 0) ||
              Number(currentStoreUser.wins ?? 0) !== Number(mergedUser.wins ?? 0) ||
              Number(currentStoreUser.losses ?? 0) !== Number(mergedUser.losses ?? 0) ||
              Number(currentStoreUser.draws ?? 0) !== Number(mergedUser.draws ?? 0) ||
              (currentStoreUser.avatarUrl || '') !== (mergedUser.avatarUrl || '')

            if (shouldSyncUser) {
              setAuthLogin(mergedUser, token)
            }
          }
        }

        if (rankedStatsResult.status === 'fulfilled') {
          setRankedStats(rankedStatsResult.value)
        }
      } catch {
        if (!mounted || loadSeqRef.current !== requestSeq) return
        setMatches([])
        setRankedStats(null)
      } finally {
        if (mounted && loadSeqRef.current === requestSeq) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [currentUserId, currentUsername, hasAvatarUrl, hasHydrated, setAuthLogin, token])

  const analytics = useMemo(() => {
    const gameCount = matches.length
    const wins = matches.filter((m) => m.result === 'win').length
    const losses = matches.filter((m) => m.result === 'lose').length
    const draws = matches.filter((m) => m.result === 'draw').length
    const winRate = gameCount > 0 ? Math.round((wins / gameCount) * 100) : 0
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
      gameCount,
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
    <div className={`font-sans ${THEME.background.page} min-h-full`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
        <section className="ui-surface ui-card-padding mb-5">
          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
            <div className="flex items-start gap-4">
              <Avatar src={user?.avatarUrl} alt={user?.username} size="lg" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] font-bold text-gray-400 mb-1">
                  Dashboard
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                  Xin chào {user?.displayName || user?.username || 'Kỳ thủ'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Theo dõi phong độ, lịch sử đấu và vào trận nhanh chỉ với một lần chạm.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="ui-chip">
                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Elo hiện tại {currentRating}
                  </span>
                  <span className="ui-chip">
                    <Target className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Win rate {analytics.winRate}%
                  </span>
                  <span className="ui-chip">
                    <Flame className="w-3.5 h-3.5 mr-1 text-orange-600" />
                    Chuỗi thắng {analytics.winStreak}
                  </span>
                </div>
              </div>
            </div>

            <div className="ui-surface-soft p-4">
              <p className="text-xs uppercase tracking-[0.14em] font-bold text-gray-400 mb-3">
                Vào trận nhanh
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className={`${action.color} text-white rounded-lg px-4 py-2.5 flex items-center justify-between transition-colors`}
                  >
                    <span className="flex items-center gap-2 font-semibold text-sm">
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
          <StatCard
            icon={Swords}
            title="Tổng ván đấu"
            value={analytics.gameCount}
            caption={`Đấu hạng ${analytics.byMode.ranked} · Bot ${analytics.byMode.bot} · Giải đấu ${analytics.byMode.tournament} · Giao hữu ${analytics.byMode.friendly}`}
          />
          <StatCard
            icon={BadgeCheck}
            title="Elo hiện tại"
            value={currentRating}
            caption={
              rankedStats?.peakRating
                ? `Elo cao nhất ${rankedStats.peakRating}`
                : 'Xếp hạng hiện tại'
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
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5 mb-5">
          <div className="ui-surface ui-card-padding">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Trận gần đây</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Dễ scan theo chế độ, kết quả và thời gian
                </p>
              </div>
              <Link
                to="/replays"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Xem toàn bộ
              </Link>
            </div>

            {recentMatches.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Chưa có trận nào để hiển thị.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentMatches.map((match) => {
                  const resultClass =
                    match.result === 'win'
                      ? 'text-green-700 bg-green-50 border-green-100'
                      : match.result === 'lose'
                        ? 'text-red-700 bg-red-50 border-red-100'
                        : 'text-gray-700 bg-gray-100 border-gray-200'

                  return (
                    <div
                      key={`${match.id}-${match.playedAt}`}
                      className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3.5 py-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <MatchModeBadge mode={match.mode} />
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${resultClass}`}
                      >
                        {match.result.toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-gray-700 truncate">{match.opponent}</p>
                      <p className="text-xs text-gray-500">{relativeTime(match.playedAt)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <section className="ui-surface ui-card-padding">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Mật độ chơi 30 ngày</h3>
                <span className="text-xs text-gray-500">Daily activity</span>
              </div>

              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                }}
              >
                {heatmap.cells.map((cell) => (
                  <div
                    key={cell.date}
                    className="aspect-square rounded-[6px] border border-white/40"
                    style={{ backgroundColor: getHeatColor(cell.count, heatmap.max) }}
                    title={`${cell.date}: ${cell.count} trận`}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                <span>Ít</span>
                <span
                  className="w-3.5 h-3.5 rounded"
                  style={{ backgroundColor: getHeatColor(0, 4) }}
                />
                <span
                  className="w-3.5 h-3.5 rounded"
                  style={{ backgroundColor: getHeatColor(1, 4) }}
                />
                <span
                  className="w-3.5 h-3.5 rounded"
                  style={{ backgroundColor: getHeatColor(2, 4) }}
                />
                <span
                  className="w-3.5 h-3.5 rounded"
                  style={{ backgroundColor: getHeatColor(3, 4) }}
                />
                <span
                  className="w-3.5 h-3.5 rounded"
                  style={{ backgroundColor: getHeatColor(4, 4) }}
                />
                <span>Nhiều</span>
              </div>
            </section>

            <section className="ui-surface ui-card-padding">
              <h3 className="text-base font-bold text-gray-900 mb-3">Tóm tắt nhanh</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Thắng</span>
                  <span className="font-bold text-green-600">{analytics.wins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Thua</span>
                  <span className="font-bold text-red-600">{analytics.losses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Hòa</span>
                  <span className="font-bold text-gray-700">{analytics.draws}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Chuỗi thắng</span>
                  <span className="font-bold text-indigo-700">{analytics.winStreak} W</span>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
