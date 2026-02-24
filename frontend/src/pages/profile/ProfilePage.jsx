import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import MOCK_USERS from '@/mocks/users.json'

// ─── WIP Banner ───────────────────────────────────────────────────────────
const WIPBanner = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1.5 tracking-wide">
    🚧 [WIP - Member 1] ProfilePage — đang dùng mock data, chưa kết nối API
  </div>
)

const StatCard = ({ label, value, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold mt-1 opacity-70">{label}</p>
    </div>
  )
}

const RatingBadge = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500 font-medium">{label}</span>
    <span className="text-base font-extrabold text-gray-900">{value}</span>
  </div>
)

const RecentGameRow = ({ opponent, result, eloChange, date }) => {
  const colors = { win: 'text-green-600', lose: 'text-red-500', draw: 'text-gray-500' }
  const labels = { win: 'Thắng', lose: 'Thua', draw: 'Hòa' }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
          {opponent[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-700">{opponent}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-sm font-bold ${colors[result]}`}>{labels[result]}</span>
        <span
          className={`text-xs font-semibold ${eloChange >= 0 ? 'text-green-600' : 'text-red-500'}`}
        >
          {eloChange >= 0 ? '+' : ''}
          {eloChange}
        </span>
        <span className="text-xs text-gray-400">{date}</span>
      </div>
    </div>
  )
}

// ── Mock recent games ──────────────────────────────────────────────────────
const MOCK_GAMES = [
  { opponent: 'GrandMaster', result: 'lose', eloChange: -16, date: '24/02' },
  { opponent: 'ChessKing', result: 'win', eloChange: +24, date: '23/02' },
  { opponent: 'Player123', result: 'win', eloChange: +20, date: '22/02' },
  { opponent: 'NightRider', result: 'draw', eloChange: +2, date: '21/02' },
  { opponent: 'KnightSlayer', result: 'win', eloChange: +18, date: '20/02' },
]

const ProfilePage = () => {
  // TODO: thay bằng dữ liệu thật từ useAuth() + API
  const { user: authUser } = useAuthStore()
  const mockUser = MOCK_USERS.users[0]

  // Merge authUser fields with mock fallback (authUser thường thiếu stats)
  const user = {
    username: authUser?.username ?? mockUser.username,
    displayName: authUser?.displayName ?? mockUser.displayName,
    email: authUser?.email ?? mockUser.email,
    bio: authUser?.bio ?? mockUser.bio,
    avatarUrl: authUser?.avatarUrl ?? mockUser.avatarUrl,
    rating: authUser?.rating ?? mockUser.rating,
    gamesPlayed: authUser?.gamesPlayed ?? mockUser.gamesPlayed,
    wins: authUser?.wins ?? mockUser.wins,
    losses: authUser?.losses ?? mockUser.losses,
    draws: authUser?.draws ?? mockUser.draws,
  }

  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0

  return (
    <>
      <WIPBanner />
      <div className="min-h-screen bg-gray-100 pt-10 pb-12">
        <div className="max-w-3xl mx-auto px-4 pt-6">
          {/* Avatar + Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            {/* Cover strip */}
            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
            {/* Profile info */}
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
                <img
                  src={user.avatarUrl ?? `https://i.pravatar.cc/100?u=${user.username}`}
                  alt={user.username}
                  className="w-20 h-20 rounded-2xl border-4 border-white shadow-md object-cover shrink-0"
                />
                <div className="flex-1 sm:pb-1">
                  <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
                    {user.displayName ?? user.username}
                  </h1>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
                </div>
                <Link
                  to="/test/auth/profile/edit"
                  className="shrink-0 self-start sm:self-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition"
                >
                  Chỉnh sửa
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-base font-bold text-gray-900 mb-4">Thống kê</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Tổng ván" value={user.gamesPlayed} color="blue" />
              <StatCard label="Thắng" value={user.wins} color="green" />
              <StatCard label="Thua" value={user.losses} color="red" />
              <StatCard label="Tỷ lệ thắng" value={`${winRate}%`} color="yellow" />
            </div>
          </div>

          {/* ELO */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-base font-bold text-gray-900 mb-2">ELO</h2>
            <RatingBadge label="🏆 ELO hiện tại" value={user.rating ?? 1200} />
          </div>

          {/* Recent Games */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-0">
            <h2 className="text-base font-bold text-gray-900 mb-3">Ván gần đây</h2>
            {MOCK_GAMES.map((g, i) => (
              <RecentGameRow key={i} {...g} />
            ))}
            <div className="mt-3 text-center">
              <Link to="/ranked/history" className="text-sm text-blue-500 hover:underline">
                Xem tất cả →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProfilePage
