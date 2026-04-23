import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bot,
  BarChart3,
  CircleUserRound,
  DoorOpen,
  Home,
  LogOut,
  PlayCircle,
  PlusSquare,
  Swords,
  Trophy,
  UsersRound,
  Video,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { useUIStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'

const NAV_GROUPS = [
  {
    group: 'Điều hướng',
    items: [{ path: '/dashboard', label: 'Dashboard', icon: Home, match: 'prefix' }],
  },
  {
    group: 'Chơi cờ',
    items: [
      { path: '/ranked', label: 'Đấu hạng', icon: Swords, match: 'prefix' },
      { path: '/bot', label: 'Đấu với Bot', icon: Bot, match: 'prefix' },
      { path: '/rooms', label: 'Phòng giao hữu', icon: DoorOpen, match: 'prefix' },
      { path: '/tournaments', label: 'Giải đấu', icon: Trophy, match: 'prefix' },
    ],
  },
  {
    group: 'Phân tích',
    items: [
      { path: '/ranked/history', label: 'Lịch sử đấu hạng', icon: PlayCircle, match: 'exact' },
      { path: '/replays', label: 'Replay', icon: Video, match: 'prefix' },
      { path: '/ranked/stats', label: 'Thống kê', icon: BarChart3, match: 'exact' },
    ],
  },
  {
    group: 'Tài khoản',
    items: [
      { path: '/profile', label: 'Hồ sơ', icon: CircleUserRound, match: 'prefix' },
      { path: '/leaderboard', label: 'Bảng xếp hạng', icon: UsersRound, match: 'prefix' },
    ],
  },
]

const isPathActive = (pathname, path, match = 'exact') => {
  if (match === 'prefix') return pathname === path || pathname.startsWith(`${path}/`)
  return pathname === path
}

const Sidebar = ({ collapsed = false }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { logout, loading: isLoggingOut } = useAuth()
  const closeSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  const handleNavClick = () => {
    if (sidebarOpen) closeSidebar()
  }

  return (
    <aside
      className={`
        bg-white/95 backdrop-blur-sm text-gray-700 flex flex-col h-full transition-all duration-300
        ${collapsed ? 'w-[74px]' : 'w-[272px]'}
      `}
    >
      <div className={`border-b border-gray-200/90 ${collapsed ? 'py-3 px-2' : 'px-3 pt-4 pb-3'}`}>
        <Link
          to="/profile"
          onClick={handleNavClick}
          className={`rounded-xl border border-gray-200 bg-gray-50/70 transition-all hover:border-gray-300 hover:bg-gray-50 ${
            collapsed ? 'flex justify-center p-2' : 'flex items-center gap-3 p-3'
          }`}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-green-500 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.displayName || user?.username || 'Người chơi'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'ChessWeb member'}</p>
              {user?.rating && <p className="text-xs text-green-700 font-semibold mt-0.5">{user.rating} ELO</p>}
            </div>
          )}
        </Link>

        {!collapsed && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/ranked"
              onClick={handleNavClick}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Swords className="w-3.5 h-3.5 text-green-700" />
              Đấu hạng
            </Link>
            <Link
              to="/rooms/create"
              onClick={handleNavClick}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <PlusSquare className="w-3.5 h-3.5 text-blue-700" />
              Tạo phòng
            </Link>
          </div>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-3' : 'px-2 py-4'}`}>
        {NAV_GROUPS.map((group) => (
          <section key={group.group} className={`${collapsed ? 'mb-2' : 'mb-5'}`}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.14em] font-bold text-gray-400">
                {group.group}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map(({ path, label, icon: Icon, match }) => {
                const active = isPathActive(location.pathname, path, match)
                return (
                  <Link
                    key={path}
                    to={path}
                    title={collapsed ? label : undefined}
                    onClick={handleNavClick}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-green-50 text-green-700 border border-green-200 shadow-[inset_3px_0_0_0_#81b64c]'
                        : 'text-gray-700 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${active ? 'text-green-700' : 'text-gray-500 group-hover:text-gray-700'}`}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-gray-200/90 px-2 py-3">
        <button
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          disabled={isLoggingOut}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 border border-transparent hover:bg-red-50 hover:border-red-100 transition-colors ${
            collapsed ? 'justify-center px-2' : ''
          } ${isLoggingOut ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
