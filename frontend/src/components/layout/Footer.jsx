import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'

const Footer = () => {
  const year = new Date().getFullYear()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white/90 backdrop-blur-sm rounded-xl">
      <div className="px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-6">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-900 text-lg font-bold">
              ♟️ ChessWeb
            </Link>
            <p className="mt-2 text-sm text-gray-600 max-w-md">
              Nền tảng chơi cờ realtime với đấu hạng, bot, phòng giao hữu và replay tập trung trong một trải nghiệm thống nhất.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/ranked"
                className="ui-chip hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors"
              >
                Đấu hạng
              </Link>
              <Link
                to="/rooms/create"
                className="ui-chip hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
              >
                Tạo phòng
              </Link>
              <Link
                to="/replays"
                className="ui-chip hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors"
              >
                Xem replay
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.14em] font-bold text-gray-400 mb-3">Khám phá</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/rooms" className="text-gray-600 hover:text-green-700 transition-colors">
                  Danh sách phòng
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-gray-600 hover:text-green-700 transition-colors">
                  Giải đấu
                </Link>
              </li>
              <li>
                <Link to="/ranked/stats" className="text-gray-600 hover:text-green-700 transition-colors">
                  Thống kê
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-600 hover:text-green-700 transition-colors">
                  Bảng xếp hạng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.14em] font-bold text-gray-400 mb-3">Tài khoản</h4>
            <ul className="space-y-2 text-sm">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/profile" className="text-gray-600 hover:text-green-700 transition-colors">
                      Hồ sơ
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile/edit" className="text-gray-600 hover:text-green-700 transition-colors">
                      Chỉnh sửa hồ sơ
                    </Link>
                  </li>
                  <li>
                    <Link to="/logout" className="text-gray-600 hover:text-red-700 transition-colors">
                      Đăng xuất
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-gray-600 hover:text-green-700 transition-colors">
                      Đăng nhập
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-gray-600 hover:text-green-700 transition-colors">
                      Đăng ký
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-500">&copy; {year} ChessWeb. Bảo lưu mọi quyền.</p>
          <p className="text-xs text-gray-500">React + chess.js + realtime socket</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
