import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { useUIStore } from '@/store'

/**
 * Sidebar - Navigation menu dọc bên trái
 * Hiển thị tất cả các mục điều hướng chính của ứng dụng
 */

// Danh sách các mục điều hướng
const NAV_ITEMS = [
  {
    group: 'General',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { path: '/profile', label: 'Profile', icon: '👤' },
      { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    ],
  },
  {
    group: 'Play',
    items: [
      { path: '/ranked', label: 'Ranked Match', icon: '⚔️' },
      { path: '/rooms', label: 'Friend Room', icon: '🚪' },
      { path: '/bot', label: 'Play vs Bot', icon: '🤖' },
    ],
  },
  {
    group: 'Tournament',
    items: [{ path: '/tournaments', label: 'Tournaments', icon: '🥇' }],
  },
  {
    group: 'History',
    items: [
      { path: '/ranked/history', label: 'Match History', icon: '📋' },
      { path: '/replays', label: 'Replays', icon: '▶️' },
      { path: '/ranked/stats', label: 'Stats', icon: '📊' },
    ],
  },
]

/**
 * @param {Object} props
 * @param {boolean} props.collapsed - Thu gọn sidebar chỉ hiện icon
 */
const Sidebar = ({ collapsed = false }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const closeSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  // Dùng exact match để tránh /ranked highlight khi vào /ranked/history
  const isActive = (path) => location.pathname === path

  // Đóng sidebar trên mobile khi click link
  const handleNavClick = () => { if (sidebarOpen) closeSidebar() }

  return (
    <aside
      className={`
        bg-white border-r border-gray-200 text-gray-700 flex flex-col h-full transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* User profile card */}
      <div className={`border-b border-gray-200 ${collapsed ? 'py-3 px-2' : 'p-4'}`}>
        <Link
          to="/profile"
          onClick={handleNavClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.username}
              className="w-9 h-9 rounded-full object-cover border-2 border-green-500 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user?.displayName || user?.username || 'User'}
              </p>
              {user?.rating && (
                <p className="text-xs text-yellow-600 font-medium">⭐ {user.rating} ELO</p>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-4">
            {/* Group label - ẩn khi collapsed */}
            {!collapsed && (
              <p className="text-xs uppercase text-gray-400 font-semibold px-3 mb-1 tracking-wider">
                {group.group}
              </p>
            )}

            {group.items.map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive(path)
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className="text-base">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: Logout */}
      <div className="border-t border-gray-200 py-3 px-2">
        <button
          onClick={() => { logout(); navigate('/login') }}
          title={collapsed ? 'Logout' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            text-red-600 hover:bg-red-50 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <span className="text-base">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
