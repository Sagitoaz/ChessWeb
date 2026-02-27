import { Link } from 'react-router-dom'
import { useUIStore } from '@/store'

/**
 * Header - Thanh tren cung
 * Chi chua: Logo | Hamburger (mobile)
 * Thong tin user (avatar, ELO, logout) da chuyen xuong Sidebar.
 */
const Header = () => {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 h-14 flex items-center px-4 sm:px-6">
      {/* Hamburger - chi hien tren mobile */}
      <button
        className="md:hidden mr-3 p-1 text-gray-600 hover:text-gray-900 rounded transition-colors"
        onClick={toggleSidebar}
        aria-label="Mo menu"
      >
        ☰
      </button>

      {/* Logo */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-green-600 transition-colors"
      >
        ♟️ <span>ChessWeb</span>
      </Link>
    </header>
  )
}

export default Header
