/**
 * HomePage - Trang chủ chính của ứng dụng
 * 
 * Hiển thị:
 * - Welcome banner
 * - Quick actions (Play, Tournaments, etc.)
 * - Recent games
 * - Leaderboard preview
 * 
 * Accessible by all users (logged in or not)
 */

import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { THEME } from '@/styles/theme'
import { Button } from '@/components/common'
import { 
  Trophy, Users, Swords, Bot, PlayCircle, 
  TrendingUp, Clock, Star 
} from 'lucide-react'

// ==================== SUB-COMPONENTS ====================

/**
 * QuickActionCard - Card cho các hành động nhanh
 */
const QuickActionCard = ({ icon: Icon, title, description, href, color = 'blue' }) => {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  }

  return (
    <Link
      to={href}
      className={`block bg-gradient-to-br ${colorMap[color]} ${THEME.rounded.lg} p-6 text-white transition-all transform hover:scale-105 ${THEME.shadow.DEFAULT}`}
    >
      <Icon className="w-12 h-12 mb-3 opacity-90" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/80 text-sm">{description}</p>
    </Link>
  )
}

/**
 * StatCard - Hiển thị một thống kê
 */
const StatCard = ({ icon: Icon, label, value }) => (
  <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-4 text-center`}>
    <Icon className={`w-8 h-8 mx-auto mb-2 ${THEME.primary.text}`} />
    <div className={`text-2xl font-bold ${THEME.text.primary}`}>{value}</div>
    <div className={`text-sm ${THEME.text.secondary}`}>{label}</div>
  </div>
)

// ==================== MAIN COMPONENT ====================

export default function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const handleQuickPlay = () => {
    if (user) {
      navigate('/ranked')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className={`min-h-screen ${THEME.background.page}`}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-6xl mb-6">♟️</div>
          <h1 className="text-5xl font-bold mb-4">ChessWeb</h1>
          <p className="text-xl mb-8 text-white/90">
            Nền tảng cờ vua trực tuyến - Thi đấu, học hỏi và kết nối
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              onClick={handleQuickPlay}
              className={`${THEME.primary.DEFAULT} ${THEME.primary.hover} ${THEME.text.inverse} font-bold px-8 py-3 ${THEME.rounded.lg}`}
            >
              <Swords className="w-5 h-5 mr-2" />
              Chơi Ngay
            </Button>
            
            {!user && (
              <Link to="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className={`${THEME.background.card} ${THEME.text.primary} border-2 border-white/30 font-bold px-8 py-3 ${THEME.rounded.lg} ${THEME.background.hover}`}
                >
                  Đăng Ký Miễn Phí
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Quick Actions Grid */}
        <section className="mb-12">
          <h2 className={`text-3xl font-bold ${THEME.text.primary} mb-6`}>
            Bắt Đầu Chơi
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickActionCard
              icon={Swords}
              title="Ranked Match"
              description="Thi đấu xếp hạng với các kỳ thủ cùng trình độ"
              href="/ranked"
              color="blue"
            />
            
            <QuickActionCard
              icon={Users}
              title="Phòng Chơi"
              description="Tạo phòng riêng và mời bạn bè tham gia"
              href="/rooms"
              color="green"
            />
            
            <QuickActionCard
              icon={Trophy}
              title="Giải Đấu"
              description="Tham gia hoặc tổ chức giải đấu"
              href="/tournaments"
              color="purple"
            />
            
            <QuickActionCard
              icon={Bot}
              title="Chơi Với Bot"
              description="Luyện tập với AI từ dễ đến khó"
              href="/bot"
              color="orange"
            />
          </div>
        </section>

        {/* Stats Section */}
        {user && (
          <section className="mb-12">
            <h2 className={`text-3xl font-bold ${THEME.text.primary} mb-6`}>
              Thống Kê Của Bạn
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Star} label="ELO Rating" value={user.rating || 1200} />
              <StatCard icon={Trophy} label="Thắng" value={user.wins || 0} />
              <StatCard icon={Clock} label="Tổng Ván" value={user.gamesPlayed || 0} />
              <StatCard icon={TrendingUp} label="Win Rate" value={`${user.wins && user.gamesPlayed ? Math.round((user.wins / user.gamesPlayed) * 100) : 0}%`} />
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="mb-12">
          <h2 className={`text-3xl font-bold ${THEME.text.primary} mb-6 text-center`}>
            Tính Năng Nổi Bật
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6 text-center`}>
              <div className={`w-16 h-16 mx-auto mb-4 ${THEME.primary.light} ${THEME.rounded.full} flex items-center justify-center`}>
                <Swords className={`w-8 h-8 ${THEME.primary.text}`} />
              </div>
              <h3 className={`text-xl font-bold ${THEME.text.primary} mb-2`}>
                Matchmaking Thông Minh
              </h3>
              <p className={THEME.text.secondary}>
                Hệ thống ghép cặp tự động dựa trên ELO rating để đảm bảo trận đấu công bằng
              </p>
            </div>

            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6 text-center`}>
              <div className={`w-16 h-16 mx-auto mb-4 ${THEME.success.light} ${THEME.rounded.full} flex items-center justify-center`}>
                <Trophy className={`w-8 h-8 ${THEME.success.text}`} />
              </div>
              <h3 className={`text-xl font-bold ${THEME.text.primary} mb-2`}>
                Giải Đấu Đa Dạng
              </h3>
              <p className={THEME.text.secondary}>
                Tham gia các giải đấu với nhiều format: Single/Double Elimination, Round Robin, Swiss
              </p>
            </div>

            <div className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-6 text-center`}>
              <div className={`w-16 h-16 mx-auto mb-4 ${THEME.warning.light} ${THEME.rounded.full} flex items-center justify-center`}>
                <PlayCircle className={`w-8 h-8 ${THEME.warning.text}`} />
              </div>
              <h3 className={`text-xl font-bold ${THEME.text.primary} mb-2`}>
                Xem Lại & Phân Tích
              </h3>
              <p className={THEME.text.secondary}>
                Replay các ván đấu đã chơi, phân tích nước đi và học hỏi từ sai lầm
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!user && (
          <section className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-12 text-center`}>
            <h2 className={`text-3xl font-bold ${THEME.text.primary} mb-4`}>
              Sẵn Sàng Bắt Đầu?
            </h2>
            <p className={`text-lg ${THEME.text.secondary} mb-6 max-w-2xl mx-auto`}>
              Tham gia cộng đồng cờ vua với hàng nghìn kỳ thủ khác. 
              Hoàn toàn miễn phí!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button
                  size="lg"
                  className={`${THEME.primary.DEFAULT} ${THEME.primary.hover} ${THEME.text.inverse} font-bold px-8 py-3 ${THEME.rounded.lg}`}
                >
                  Đăng Ký Ngay
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className={`border-2 ${THEME.border.DEFAULT} ${THEME.text.primary} font-bold px-8 py-3 ${THEME.rounded.lg} ${THEME.background.hover}`}
                >
                  Đã Có Tài Khoản
                </Button>
              </Link>
            </div>
          </section>
        )}

        {/* Developer Test Links - Visible to all */}
        <section className="mt-8">
          <Link 
            to="/testlinks"
            className={`block bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white ${THEME.rounded.lg} p-6 text-center transition-all transform hover:scale-105 ${THEME.shadow.DEFAULT}`}
          >
            <Star className="w-8 h-8 mx-auto mb-2" />
            <h3 className="text-xl font-bold mb-2">🧪 Developer Test Hub</h3>
            <p className="text-white/90 text-sm">
              Access all pages directly for UI testing • No authentication required
            </p>
          </Link>
        </section>
      </div>
    </div>
  )
}
