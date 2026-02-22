import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

/**
 * Header - Navbar chính của ứng dụng
 * Hiển thị logo, navigation links và thông tin user (nếu đã đăng nhập)
 */
const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Lấy thông tin user từ localStorage
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isLoggedIn = !!token

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Kiểm tra link đang active
  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-white hover:text-green-400 transition-colors"
          >
            ♟️ <span>ChessWeb</span>
          </Link>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {isLoggedIn && (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-colors hover:text-green-400 ${isActive('/dashboard') ? 'text-green-400' : 'text-gray-300'}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/ranked"
                  className={`text-sm font-medium transition-colors hover:text-green-400 ${isActive('/ranked') ? 'text-green-400' : 'text-gray-300'}`}
                >
                  Ranked
                </Link>
                <Link
                  to="/rooms"
                  className={`text-sm font-medium transition-colors hover:text-green-400 ${isActive('/rooms') ? 'text-green-400' : 'text-gray-300'}`}
                >
                  Rooms
                </Link>
                <Link
                  to="/tournaments"
                  className={`text-sm font-medium transition-colors hover:text-green-400 ${isActive('/tournaments') ? 'text-green-400' : 'text-gray-300'}`}
                >
                  Tournaments
                </Link>
                <Link
                  to="/bot"
                  className={`text-sm font-medium transition-colors hover:text-green-400 ${isActive('/bot') ? 'text-green-400' : 'text-gray-300'}`}
                >
                  Play vs Bot
                </Link>
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Avatar + Tên user */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-green-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium text-gray-200">
                    {user?.username || 'User'}
                  </span>
                </Link>

                {/* Elo rating */}
                {user?.rating && (
                  <span className="hidden md:block text-xs text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-1 rounded">
                    ⭐ {user.rating}
                  </span>
                )}

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Register
                </Link>
              </>
            )}

            {/* Hamburger menu mobile */}
            <button
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && isLoggedIn && (
          <nav className="md:hidden pb-4 border-t border-gray-700 mt-2 pt-2 flex flex-col gap-2">
            {[
              { path: '/dashboard', label: 'Dashboard' },
              { path: '/ranked', label: 'Ranked' },
              { path: '/rooms', label: 'Rooms' },
              { path: '/tournaments', label: 'Tournaments' },
              { path: '/bot', label: 'Play vs Bot' },
              { path: '/replays', label: 'Replays' },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className={`text-sm px-2 py-1 rounded transition-colors hover:text-green-400 ${
                  isActive(path) ? 'text-green-400' : 'text-gray-300'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header
