/**
 * DashboardPage - Trang dashboard sau khi login
 *
 * Hiển thị:
 * - User stats overview
 * - Recent games
 * - Quick access to game modes
 * - Upcoming tournaments
 *
 * Protected route - Requires authentication
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import gameService from '@/services/gameService'
import { THEME, STATUS_COLORS } from '@/styles/theme'
import { Avatar } from '@/components/common'
import {
  Trophy,
  Users,
  Swords,
  Bot,
  Clock,
  Target,
  PlayCircle,
  Calendar,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react'

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

const formatRelativeTime = (value) => {
  if (!value) return 'vừa xong'
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return 'vừa xong'

  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`

  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} ngày trước`
}

const formatStreak = (stats) => {
  const count = Number(stats?.currentStreak ?? 0)
  const type = stats?.currentStreakType
  if (!count || !type) return '0'
  return `${count}${type === 'win' ? 'W' : 'L'}`
}

const formatAverageOpponent = (value) => {
  const rating = Number(value ?? 0)
  return rating > 0 ? rating : '—'
}

// ==================== SUB-COMPONENTS ====================

/**
 * StatCard - Card hiển thị thống kê
 */
const StatCard = ({ icon: Icon, label, value, change, trend }) => (
  <div
    className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-5`}
  >
    <div className="flex items-start justify-between mb-3">
      <div
        className={`w-12 h-12 ${THEME.primary.light} ${THEME.rounded.DEFAULT} flex items-center justify-center`}
      >
        <Icon className={`w-6 h-6 ${THEME.primary.text}`} />
      </div>
      {change && (
        <div
          className={`flex items-center text-sm font-semibold ${trend === 'up' ? STATUS_COLORS.win.icon : STATUS_COLORS.lose.icon}`}
        >
          {trend === 'up' ? '+' : ''}
          {change}
        </div>
      )}
    </div>
    <div className={`text-3xl font-bold ${THEME.text.primary} mb-1`}>{value}</div>
    <div className={`text-sm ${THEME.text.secondary}`}>{label}</div>
  </div>
)

/**
 * QuickActionButton - Button hành động nhanh
 */
const QuickActionButton = ({ icon: Icon, label, href, color = 'blue' }) => {
  const colorMap = {
    blue: `${THEME.primary.DEFAULT} ${THEME.primary.hover}`,
    green: `${THEME.success.DEFAULT} ${THEME.success.hover}`,
    purple: 'bg-purple-600 hover:bg-purple-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
  }

  return (
    <Link
      to={href}
      className={`${colorMap[color]} ${THEME.text.inverse} ${THEME.rounded.lg} p-4 flex items-center justify-between transition-colors ${THEME.shadow.sm}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <span className="font-semibold">{label}</span>
      </div>
      <ArrowRight className="w-5 h-5" />
    </Link>
  )
}

/**
 * RecentGameRow - Hiển thị một game gần đây
 */
const RecentGameRow = ({ game }) => {
  const resultConfig = {
    win: { label: 'Thắng', color: STATUS_COLORS.win.icon },
    lose: { label: 'Thua', color: STATUS_COLORS.lose.icon },
    draw: { label: 'Hòa', color: STATUS_COLORS.draw.icon },
  }
  const normalizedResult = game.result === 'loss' ? 'lose' : game.result
  const { label, color } = resultConfig[normalizedResult] || resultConfig.draw

  return (
    <div
      className={`flex items-center justify-between py-3 border-b ${THEME.border.DEFAULT} last:border-0`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 ${THEME.rounded.full} ${THEME.background.active} flex items-center justify-center font-bold ${THEME.text.secondary}`}
        >
          {(game.opponent || '?')[0]}
        </div>
        <div>
          <div className={`font-medium ${THEME.text.primary}`}>{game.opponent}</div>
          <div className={`text-xs ${THEME.text.muted}`}>
            {game.mode} • {formatDuration(game.duration)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${color}`}>{label}</div>
        {game.eloChange !== 0 && (
          <div
            className={`text-xs font-semibold ${game.eloChange > 0 ? STATUS_COLORS.win.icon : STATUS_COLORS.lose.icon}`}
          >
            {game.eloChange > 0 ? '+' : ''}
            {game.eloChange} ELO
          </div>
        )}
        <div className={`text-xs ${THEME.text.muted}`}>{formatRelativeTime(game.playedAt)}</div>
      </div>
    </div>
  )
}

/**
 * TournamentCard - Card giải đấu
 */
const TournamentCard = ({ tournament }) => (
  <Link
    to={`/tournaments/${tournament.id}`}
    className={`block ${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-4 ${THEME.background.hover} transition-colors`}
  >
    <div className="flex items-start justify-between mb-2">
      <h4 className={`font-semibold ${THEME.text.primary}`}>{tournament.name}</h4>
      <Trophy className={`w-5 h-5 ${THEME.warning.text}`} />
    </div>
    <div className={`text-sm ${THEME.text.secondary} space-y-1`}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span>{tournament.players} người chơi</span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span>Bắt đầu {tournament.startTime}</span>
      </div>
    </div>
  </Link>
)

// ==================== MAIN COMPONENT ====================

export default function DashboardPage() {
  const { user, hasHydrated } = useAuthStore()
  const token = useAuthStore((state) => state.token)
  const setAuthLogin = useAuthStore((state) => state.login)
  const [recentGames, setRecentGames] = useState([])
  const [upcomingTournaments, setUpcomingTournaments] = useState([])
  const [rankedStats, setRankedStats] = useState(null)

  useEffect(() => {
    if (!hasHydrated || !token) return

    let mounted = true
    const refresh = async () => {
      const [profileResult, gamesResult, tournamentsResult, rankedStatsResult] =
        await Promise.allSettled([
          authService.getCurrentUser(),
          gameService.getRankedHistory(1, 4),
          gameService.getTournaments({ status: 'registration', page: 1, pageSize: 4 }),
          gameService.getRankedStats(),
        ])

      if (!mounted) return

      if (profileResult.status === 'fulfilled') {
        const profileData = profileResult.value?.data ?? profileResult.value
        const nextUser = profileData?.user ?? profileData
        if (nextUser) {
          const rankedStats =
            rankedStatsResult.status === 'fulfilled' ? rankedStatsResult.value : null
          const statsData = rankedStats?.data ?? rankedStats
          setAuthLogin(
            {
              ...nextUser,
              rating: Number(statsData?.currentRating ?? nextUser.rating ?? 1200),
              gamesPlayed: Number(statsData?.gamesPlayed ?? nextUser.gamesPlayed ?? 0),
              wins: Number(statsData?.wins ?? nextUser.wins ?? 0),
              losses: Number(statsData?.losses ?? nextUser.losses ?? 0),
              draws: Number(statsData?.draws ?? nextUser.draws ?? 0),
            },
            token
          )
        }
      }

      if (gamesResult.status === 'fulfilled') {
        const history = gamesResult.value
        const matches = Array.isArray(history?.matches) ? history.matches : []
        const normalizedGames = matches.map((item) => ({
          id: item.id,
          opponent: item.opponent?.username || 'Đối thủ',
          result: item.result === 'loss' ? 'lose' : item.result || 'draw',
          eloChange: Number(item.ratingChange || 0),
          mode: 'ranked',
          duration: Number(item.duration || 0),
          playedAt: item.playedAt || null,
        }))
        setRecentGames(normalizedGames)
      }

      if (tournamentsResult.status === 'fulfilled') {
        const tournamentsData = tournamentsResult.value?.data ?? tournamentsResult.value
        const tournaments = Array.isArray(tournamentsData?.tournaments)
          ? tournamentsData.tournaments
          : []
        const normalizedTournaments = tournaments.map((tournament) => ({
          id: tournament.id || tournament._id,
          name: tournament.name || 'Giải đấu',
          players: tournament.participants || tournament.currentPlayers || 0,
          startTime:
            tournament.startAt ||
            tournament.startTime ||
            tournament.start_date ||
            new Date().toISOString(),
        }))
        setUpcomingTournaments(normalizedTournaments)
      }

      if (rankedStatsResult.status === 'fulfilled') {
        const stats = rankedStatsResult.value?.data ?? rankedStatsResult.value
        setRankedStats(stats)
      }
    }
    void refresh()

    return () => {
      mounted = false
    }
  }, [hasHydrated, setAuthLogin, token])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Đang tải dashboard...</div>
      </div>
    )
  }

  const fallbackUser = {
    username: 'Kỳ thủ',
    displayName: 'Kỳ thủ',
    avatarUrl: null,
    rating: 1200,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  }
  const profile = user ?? fallbackUser
  const displayedRating = Number(rankedStats?.currentRating ?? profile.rating ?? 1200)
  const displayedWins = Number(rankedStats?.wins ?? profile.wins ?? 0)
  const displayedGames = Number(rankedStats?.gamesPlayed ?? profile.gamesPlayed ?? 0)
  const displayedStreak = formatStreak(rankedStats)
  const displayedAvgOpponent = formatAverageOpponent(rankedStats?.avgOpponentRating)
  const winRate =
    displayedGames > 0
      ? Math.round(
          Number(
            rankedStats?.winRate ??
              (Number(rankedStats?.wins ?? profile.wins ?? 0) / displayedGames) * 100
          )
        )
      : 0

  return (
    <div className={`min-h-screen ${THEME.background.page} py-6`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Avatar src={profile.avatarUrl} alt={profile.username} size="lg" />
            <div>
              <h1 className={`text-3xl font-bold ${THEME.text.primary}`}>
                Xin chào, {profile.displayName || profile.username}! 👋
              </h1>
              <p className={THEME.text.secondary}>Sẵn sàng cho trận đấu tiếp theo?</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Star} label="ELO Rating" value={displayedRating} />
          <StatCard icon={Trophy} label="Thắng" value={displayedWins} />
          <StatCard icon={Clock} label="Tổng Ván" value={displayedGames} />
          <StatCard icon={Target} label="Tỷ Lệ Thắng" value={`${winRate}%`} />
          <StatCard icon={Zap} label="Streak" value={displayedStreak} />
          <StatCard icon={Users} label="AVG Opp" value={displayedAvgOpponent} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickActionButton icon={Swords} label="Ranked Match" href="/ranked" color="blue" />
          <QuickActionButton icon={Users} label="Phòng Chơi" href="/rooms" color="green" />
          <QuickActionButton icon={Trophy} label="Giải Đấu" href="/tournaments" color="purple" />
          <QuickActionButton icon={Bot} label="Chơi Với Bot" href="/bot" color="orange" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Games - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div
              className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${THEME.text.primary}`}>Ván Đấu Gần Đây</h2>
                <Link
                  to="/ranked/history"
                  className={`text-sm ${THEME.primary.text} ${THEME.primary.textHover} font-medium`}
                >
                  Xem tất cả →
                </Link>
              </div>

              <div>
                {recentGames.map((game) => (
                  <RecentGameRow key={game.id} game={game} />
                ))}
              </div>

              {recentGames.length === 0 && (
                <div className="text-center py-8">
                  <PlayCircle className={`w-16 h-16 mx-auto mb-3 ${THEME.text.muted}`} />
                  <p className={THEME.text.secondary}>Chưa có ván đấu nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Tournaments */}
            <div
              className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${THEME.text.primary}`}>Giải Đấu Sắp Diễn Ra</h3>
              </div>

              <div className="space-y-3">
                {upcomingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
                {upcomingTournaments.length === 0 && (
                  <p className={`text-sm ${THEME.text.secondary}`}>Chưa có giải đấu sắp diễn ra.</p>
                )}
              </div>

              <Link
                to="/tournaments"
                className={`block text-center mt-4 text-sm ${THEME.primary.text} ${THEME.primary.textHover} font-medium`}
              >
                Xem tất cả giải đấu →
              </Link>
            </div>

            {/* Quick Tips */}
            <div
              className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-5 h-5 ${THEME.warning.text}`} />
                <h3 className={`text-lg font-bold ${THEME.text.primary}`}>Mẹo Hôm Nay</h3>
              </div>
              <p className={`text-sm ${THEME.text.secondary}`}>
                Kiểm soát trung tâm bàn cờ là chìa khóa để dẫn dắt trận đấu. Cố gắng đặt quân ở các
                ô d4, d5, e4, e5 ngay từ đầu game!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
