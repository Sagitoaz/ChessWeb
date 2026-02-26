import { Link, useLocation } from 'react-router-dom'

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

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <aside
      className={`
        bg-white border-r border-gray-200 text-gray-700 flex flex-col h-full transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
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

      {/* Bottom: Settings */}
      <div className="border-t border-gray-200 py-3 px-2">
        <Link
          to="/profile/edit"
          title={collapsed ? 'Settings' : undefined}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            hover:bg-gray-100 hover:text-gray-900 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <span className="text-base">⚙️</span>
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
