import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'

/**
 * Footer - Footer của ứng dụng
 * Hiển thị links điều hướng và thông tin copyright
 */
const Footer = () => {
  const year = new Date().getFullYear()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-600 mt-auto shadow-[0_-1px_0_0_rgba(15,23,42,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          {/* Branding + Actions */}
          <div>
            <Link to="/" className="text-gray-900 text-lg font-bold flex items-center gap-2 mb-3">
              ♟️ ChessWeb
            </Link>
            <p className="text-sm text-gray-500 mb-4">
              Chơi nhanh, tạo phòng trong vài giây, và theo dõi toàn bộ lịch sử trận đấu ở một nơi.
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/rooms/create"
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                Tạo phòng
              </Link>
              <Link
                to="/rooms/join"
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Nhập mã phòng
              </Link>
              <Link
                to="/replays"
                className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Xem replay
              </Link>
            </div>
          </div>

          {/* Play Links */}
          <div>
            <h4 className="text-gray-900 text-sm font-semibold mb-3 uppercase tracking-wide">
              Chơi nhanh
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/ranked" className="hover:text-green-600 transition-colors">
                  Đấu hạng
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="hover:text-green-600 transition-colors">
                  Phòng giao hữu
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="hover:text-green-600 transition-colors">
                  Danh sách phòng
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-green-600 transition-colors">
                  Giải đấu
                </Link>
              </li>
              <li>
                <Link to="/bot" className="hover:text-green-600 transition-colors">
                  Đấu với Bot
                </Link>
              </li>
            </ul>
          </div>

          {/* Room Links */}
          <div>
            <h4 className="text-gray-900 text-sm font-semibold mb-3 uppercase tracking-wide">
              Phòng chơi
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/rooms/create" className="hover:text-green-600 transition-colors">
                  Tạo phòng riêng
                </Link>
              </li>
              <li>
                <Link to="/rooms/join" className="hover:text-green-600 transition-colors">
                  Tham gia bằng mã
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="hover:text-green-600 transition-colors">
                  Phòng công khai
                </Link>
              </li>
              <li>
                <Link to="/replays" className="hover:text-green-600 transition-colors">
                  Lịch sử phòng
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-gray-900 text-sm font-semibold mb-3 uppercase tracking-wide">
              Tài khoản
            </h4>
            <ul className="space-y-2 text-sm">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/profile" className="hover:text-green-600 transition-colors">
                      Hồ sơ
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile/edit" className="hover:text-green-600 transition-colors">
                      Chỉnh sửa hồ sơ
                    </Link>
                  </li>
                  <li>
                    <Link to="/leaderboard" className="hover:text-green-600 transition-colors">
                      Bảng xếp hạng
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-green-600 transition-colors">
                      Đăng nhập
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-green-600 transition-colors">
                      Đăng ký
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">&copy; {year} ChessWeb. Bảo lưu mọi quyền.</p>
          <p className="text-xs text-gray-600">React + chess.js + realtime sockets</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
