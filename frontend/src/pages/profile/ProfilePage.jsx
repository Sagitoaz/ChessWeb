import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts'
import { Avatar } from '@/components/common'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import gameService, { replayAPI } from '@/services/gameService'
import { THEME } from '@/styles/theme'
import { Bot, Swords, Trophy, Users, Brain, BarChart3 } from 'lucide-react'

const MODE_META = {
  ranked: {
    key: 'ranked',
    label: 'Đấu Hạng',
    short: 'Rank',
    color: '#2563eb',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Swords,
  },
  bot: {
    key: 'bot',
    label: 'Đấu Bot',
    short: 'Bot',
    color: '#7c3aed',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: Bot,
  },
  tournament: {
    key: 'tournament',
    label: 'Đấu Giải',
    short: 'Tour',
    color: '#d97706',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Trophy,
  },
  friendly: {
    key: 'friendly',
    label: 'Giao Hữu',
    short: 'Friendly',
    color: '#059669',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Users,
  },
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

const calculateRadar = ({ total, winRate, avgDuration, currentRating, winStreak }) => {
  const gamesFactor = Math.min(100, total * 2)
  const ratingFactor = Math.min(100, Math.max(0, (currentRating - 800) / 16))
  const speedFactor = avgDuration > 0 ? Math.max(25, Math.min(100, 110 - avgDuration / 18)) : 55

  const opening = Math.round(Math.min(100, 35 + winRate * 0.45 + gamesFactor * 0.2))
  const midgame = Math.round(Math.min(100, 30 + winRate * 0.55 + ratingFactor * 0.25))
  const endgame = Math.round(Math.min(100, 28 + winRate * 0.4 + gamesFactor * 0.25))
  const speed = Math.round(Math.min(100, 20 + speedFactor * 0.7 + winStreak * 2))
  const tactics = Math.round(Math.min(100, 26 + ratingFactor * 0.5 + winRate * 0.35))

  return [
    { subject: 'Opening', score: opening },
    { subject: 'Midgame', score: midgame },
    { subject: 'Endgame', score: endgame },
    { subject: 'Speed', score: speed },
    { subject: 'Tactics', score: tactics },
  ]
}

const ResultPill = ({ result }) => {
  const config = {
    win: 'bg-green-100 text-green-700',
    lose: 'bg-red-100 text-red-700',
    draw: 'bg-gray-100 text-gray-700',
  }
  const label = result === 'win' ? 'WIN' : result === 'lose' ? 'LOSS' : 'DRAW'
  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${config[result] || config.draw}`}
    >
      {label}
    </span>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const setAuthLogin = useAuthStore((state) => state.login)

  const [loading, setLoading] = useState(true)
  const [rankedStats, setRankedStats] = useState(null)
  const [matches, setMatches] = useState([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      const [profileResult, rankedResult, replayResult, rankedStatsResult] =
        await Promise.allSettled([
          authService.getCurrentUser(),
          gameService.getRankedHistory(1, 120),
          replayAPI.getGameHistory({ page: 1, pageSize: 160 }),
          gameService.getRankedStats(),
        ])

      if (!mounted) return

      const rankedHistory =
        rankedResult.status === 'fulfilled' ? rankedResult.value : { matches: [] }
      const replayHistory = replayResult.status === 'fulfilled' ? replayResult.value : { games: [] }
      setMatches(
        mergeMatches({
          replayPayload: replayHistory,
          rankedPayload: rankedHistory,
          username: authUser?.username,
        })
      )

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
  }, [authUser?.username, setAuthLogin, token])

  const profile = {
    username: authUser?.username ?? 'unknown',
    displayName: authUser?.displayName ?? authUser?.username ?? 'Người chơi',
    email: authUser?.email ?? '',
    bio: authUser?.bio ?? '',
    avatarUrl: authUser?.avatarUrl ?? null,
    rating: Number(rankedStats?.currentRating ?? authUser?.rating ?? 1200),
  }

  const analytics = useMemo(() => {
    const totalFromMatches = matches.length
    const winsFromMatches = matches.filter((m) => m.result === 'win').length
    const lossesFromMatches = matches.filter((m) => m.result === 'lose').length
    const drawsFromMatches = matches.filter((m) => m.result === 'draw').length

    const statsTotal = Number(rankedStats?.gamesPlayed ?? 0)
    const statsWins = Number(rankedStats?.wins ?? 0)
    const statsLosses = Number(rankedStats?.losses ?? 0)
    const statsDraws = Number(rankedStats?.draws ?? 0)

    const useStatsFallback = totalFromMatches === 0 && statsTotal > 0
    const total = useStatsFallback ? statsTotal : totalFromMatches
    const wins = useStatsFallback ? statsWins : winsFromMatches
    const losses = useStatsFallback ? statsLosses : lossesFromMatches
    const draws = useStatsFallback ? statsDraws : drawsFromMatches
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    const avgDuration =
      totalFromMatches > 0
        ? Math.round(matches.reduce((acc, item) => acc + Number(item.duration || 0), 0) / total)
        : 0

    const distributionRaw = matches.reduce(
      (acc, match) => {
        const mode = normalizeMode(match.mode)
        acc[mode] += 1
        return acc
      },
      { ranked: 0, bot: 0, tournament: 0, friendly: 0 }
    )

    if (useStatsFallback) {
      distributionRaw.ranked = total
    }

    const pieData = Object.keys(distributionRaw)
      .map((key) => ({
        key,
        name: MODE_META[key].label,
        value: distributionRaw[key],
        color: MODE_META[key].color,
      }))
      .filter((item) => item.value > 0)

    const winStreak = (() => {
      let streak = 0
      for (const item of matches) {
        if (item.result !== 'win') break
        streak += 1
      }
      return streak
    })()

    return {
      total,
      wins,
      losses,
      draws,
      winRate,
      avgDuration,
      distributionRaw,
      pieData,
      radarData: calculateRadar({
        total,
        winRate,
        avgDuration,
        currentRating: profile.rating,
        winStreak,
      }),
      winStreak,
    }
  }, [matches, profile.rating])

  const recentMatches = matches.slice(0, 12)

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-sm text-gray-500">Đang tải Profile...</div>
      </div>
    )
  }

  return (
    <div className={`font-sans ${THEME.background.page} min-h-full py-6`}>
      <div className="max-w-7xl mx-auto px-4">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <Avatar src={profile.avatarUrl} name={profile.username} size="xl" />
              <div>
                <h1 className="text-2xl font-black text-gray-900">{profile.displayName}</h1>
                <p className="text-sm text-gray-500">@{profile.username}</p>
                {profile.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/profile/edit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
              >
                Chỉnh sửa
              </Link>
              <button
                onClick={() => {
                  useAuthStore.getState().logout()
                  window.location.hash = '#/login'
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg border border-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Match Distribution</h2>
              </div>

              {analytics.pieData.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu để vẽ biểu đồ phân bổ trận.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analytics.pieData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} trận`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(MODE_META).map((key) => {
                      const meta = MODE_META[key]
                      const Icon = meta.icon
                      const value = analytics.distributionRaw[key]
                      const percent =
                        analytics.total > 0 ? Math.round((value / analytics.total) * 100) : 0
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Icon className="w-4 h-4" style={{ color: meta.color }} />
                            {meta.label}
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {value} · {percent}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Performance Radar</h2>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analytics.radarData} outerRadius="68%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                    <Radar
                      name="Skill"
                      dataKey="score"
                      stroke="#4f46e5"
                      fill="#6366f1"
                      fillOpacity={0.35}
                    />
                    <Tooltip formatter={(value) => [`${value}/100`, 'Điểm']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Matches</h2>

              {recentMatches.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có trận gần đây.</p>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((match) => {
                    const mode = normalizeMode(match.mode)
                    const modeMeta = MODE_META[mode] || MODE_META.friendly
                    const resultClass =
                      match.result === 'win'
                        ? 'text-green-600 bg-green-50'
                        : match.result === 'lose'
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-600 bg-gray-100'

                    return (
                      <div
                        key={`${match.id}-${match.playedAt}`}
                        className="grid grid-cols-1 xl:grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                      >
                        <span
                          className={`px-2 py-1 text-xs rounded-full border font-semibold ${modeMeta.badge}`}
                        >
                          {modeMeta.short}
                        </span>
                        <ResultPill result={match.result} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {match.opponent}
                          </p>
                          <p className="text-xs text-gray-500">{relativeTime(match.playedAt)}</p>
                        </div>
                        {match.canAnalyze ? (
                          <button
                            onClick={() => navigate(`/replays/${match.id}`)}
                            className="px-3 py-1.5 text-xs rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
                          >
                            AI Analysis
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-200 bg-gray-100 text-gray-400 font-semibold cursor-not-allowed"
                          >
                            AI Analysis
                          </button>
                        )}
                        <span className="text-xs text-gray-500">
                          {match.duration ? `${Math.round(match.duration / 60)}m` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tổng quan</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng trận</span>
                  <span className="font-bold text-gray-900">{analytics.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Elo hiện tại</span>
                  <span className="font-bold text-blue-700">{profile.rating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ thắng</span>
                  <span className="font-bold text-green-700">{analytics.winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thắng / Thua / Hòa</span>
                  <span className="font-bold text-gray-900">
                    {analytics.wins} / {analytics.losses} / {analytics.draws}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chuỗi thắng</span>
                  <span className="font-bold text-indigo-700">{analytics.winStreak} W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TB thời lượng trận</span>
                  <span className="font-bold text-gray-700">
                    {analytics.avgDuration > 0
                      ? `${Math.round(analytics.avgDuration / 60)} phút`
                      : '—'}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Truy cập nhanh</h3>
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Về Dashboard
                </Link>
                <Link
                  to="/replays"
                  className="block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Xem Replay Library
                </Link>
                <Link
                  to="/ranked/stats"
                  className="block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Thống kê Rank chi tiết
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
