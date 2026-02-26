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

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { THEME, STATUS_COLORS } from '@/styles/theme'
import { Button, Avatar } from '@/components/common'
import { 
  Trophy, Users, Swords, Bot, TrendingUp, 
  Clock, Target, Medal, PlayCircle, Calendar,
  ArrowRight, Star, Zap
} from 'lucide-react'

// ==================== MOCK DATA ====================
const MOCK_RECENT_GAMES = [
  { id: 1, opponent: 'GrandMaster', result: 'win', eloChange: +24, mode: 'Ranked', time: '2 giờ trước' },
  { id: 2, opponent: 'ChessKing', result: 'lose', eloChange: -18, mode: 'Ranked', time: '5 giờ trước' },
  { id: 3, opponent: 'Bot Level 3', result: 'win', eloChange: 0, mode: 'Bot', time: '1 ngày trước' },
]

const MOCK_TOURNAMENTS = [
  { id: 1, name: 'Giải Cờ Vua Mùa Xuân', players: '16/32', startTime: '2 ngày nữa' },
  { id: 2, name: 'Blitz Championship', players: '24/64', startTime: '5 ngày nữa' },
]

// ==================== SUB-COMPONENTS ====================

/**
 * StatCard - Card hiển thị thống kê
 */
const StatCard = ({ icon: Icon, label, value, change, trend }) => (
  <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-5`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-12 h-12 ${THEME.primary.light} ${THEME.rounded.DEFAULT} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${THEME.primary.text}`} />
      </div>
      {change && (
        <div className={`flex items-center text-sm font-semibold ${trend === 'up' ? STATUS_COLORS.win.icon : STATUS_COLORS.lose.icon}`}>
          {trend === 'up' ? '+' : ''}{change}
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
  const { label, color } = resultConfig[game.result]

  return (
    <div className={`flex items-center justify-between py-3 border-b ${THEME.border.DEFAULT} last:border-0`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${THEME.rounded.full} ${THEME.background.active} flex items-center justify-center font-bold ${THEME.text.secondary}`}>
          {game.opponent[0]}
        </div>
        <div>
          <div className={`font-medium ${THEME.text.primary}`}>{game.opponent}</div>
          <div className={`text-xs ${THEME.text.muted}`}>{game.mode} • {game.time}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${color}`}>{label}</div>
        {game.eloChange !== 0 && (
          <div className={`text-xs font-semibold ${game.eloChange > 0 ? STATUS_COLORS.win.icon : STATUS_COLORS.lose.icon}`}>
            {game.eloChange > 0 ? '+' : ''}{game.eloChange} ELO
          </div>
        )}
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
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Redirect nếu chưa login
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  if (!user) return null

  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0

  return (
    <div className={`min-h-screen ${THEME.background.page} py-6`}>
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Avatar 
              src={user.avatarUrl} 
              alt={user.username}
              size="lg"
            />
            <div>
              <h1 className={`text-3xl font-bold ${THEME.text.primary}`}>
                Xin chào, {user.displayName || user.username}! 👋
              </h1>
              <p className={THEME.text.secondary}>
                Sẵn sàng cho trận đấu tiếp theo?
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Star} 
            label="ELO Rating" 
            value={user.rating || 1200}
            change={24}
            trend="up"
          />
          <StatCard 
            icon={Trophy} 
            label="Thắng" 
            value={user.wins || 0}
          />
          <StatCard 
            icon={Clock} 
            label="Tổng Ván" 
            value={user.gamesPlayed || 0}
          />
          <StatCard 
            icon={Target} 
            label="Tỷ Lệ Thắng" 
            value={`${winRate}%`}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickActionButton 
            icon={Swords} 
            label="Ranked Match" 
            href="/ranked" 
            color="blue"
          />
          <QuickActionButton 
            icon={Users} 
            label="Phòng Chơi" 
            href="/rooms" 
            color="green"
          />
          <QuickActionButton 
            icon={Trophy} 
            label="Giải Đấu" 
            href="/tournaments" 
            color="purple"
          />
          <QuickActionButton 
            icon={Bot} 
            label="Chơi Với Bot" 
            href="/bot" 
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Games - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${THEME.text.primary}`}>
                  Ván Đấu Gần Đây
                </h2>
                <Link 
                  to="/ranked/history" 
                  className={`text-sm ${THEME.primary.text} ${THEME.primary.textHover} font-medium`}
                >
                  Xem tất cả →
                </Link>
              </div>
              
              <div>
                {MOCK_RECENT_GAMES.map(game => (
                  <RecentGameRow key={game.id} game={game} />
                ))}
              </div>

              {MOCK_RECENT_GAMES.length === 0 && (
                <div className="text-center py-8">
                  <PlayCircle className={`w-16 h-16 mx-auto mb-3 ${THEME.text.muted}`} />
                  <p className={THEME.text.secondary}>Chưa có ván đấu nào</p>
                  <Button
                    onClick={() => navigate('/ranked')}
                    className={`mt-4 ${THEME.primary.DEFAULT} ${THEME.primary.hover}`}
                  >
                    Chơi Ngay
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-6">
            
            {/* Tournaments */}
            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${THEME.text.primary}`}>
                  Giải Đấu Sắp Diễn Ra
                </h3>
              </div>
              
              <div className="space-y-3">
                {MOCK_TOURNAMENTS.map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>

              <Link
                to="/tournaments"
                className={`block text-center mt-4 text-sm ${THEME.primary.text} ${THEME.primary.textHover} font-medium`}
              >
                Xem tất cả giải đấu →
              </Link>
            </div>

            {/* Quick Tips */}
            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6`}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-5 h-5 ${THEME.warning.text}`} />
                <h3 className={`text-lg font-bold ${THEME.text.primary}`}>
                  Mẹo Hôm Nay
                </h3>
              </div>
              <p className={`text-sm ${THEME.text.secondary}`}>
                Kiểm soát trung tâm bàn cờ là chìa khóa để dẫn dắt trận đấu. 
                Cố gắng đặt quân ở các ô d4, d5, e4, e5 ngay từ đầu game!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
