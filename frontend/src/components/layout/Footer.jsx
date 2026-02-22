import { Link } from 'react-router-dom'

/**
 * Footer - Footer của ứng dụng
 * Hiển thị links điều hướng và thông tin copyright
 */
const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Branding */}
          <div>
            <Link to="/" className="text-white text-lg font-bold flex items-center gap-2 mb-2">
              ♟️ ChessWeb
            </Link>
            <p className="text-sm text-gray-500">
              Nền tảng chơi cờ vua trực tuyến – Thách thức bạn bè, leo rank và tham gia giải đấu.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/ranked" className="hover:text-green-400 transition-colors">
                  Ranked Match
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="hover:text-green-400 transition-colors">
                  Friend Rooms
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-green-400 transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/bot" className="hover:text-green-400 transition-colors">
                  Play vs Bot
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-green-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Account
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-green-400 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-green-400 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-green-400 transition-colors">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/profile/edit" className="hover:text-green-400 transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">&copy; {year} ChessWeb. All rights reserved.</p>
          <p className="text-xs text-gray-600">Built with ⚛️ React + ♟️ chess.js</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
