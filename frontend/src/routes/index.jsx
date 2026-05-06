import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'
import { AppLayout } from '@components/layout'
import PublicRoute from './PublicRoute'
import PrivateRoute from './PrivateRoute'

// =============================================================================
// LAZY IMPORTS — Mỗi trang được tải khi người dùng truy cập (tối ưu tốc độ)
// =============================================================================

// Auth Pages (đăng nhập / đăng ký)
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const LogoutPage = lazy(() => import('@pages/auth/LogoutPage'))
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'))

// Home
const DashboardPage = lazy(() => import('@pages/home/DashboardPage'))

// Profile
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'))
const EditProfilePage = lazy(() => import('@pages/profile/EditProfilePage'))
const LeaderboardPage = lazy(() => import('@pages/profile/LeaderboardPage'))

// Ranked — những trang này quản lý layout BÊN TRONG nên không cần AppLayout bọc ngoài
const RankedLobbyPage = lazy(() => import('@pages/ranked/RankedLobbyPage'))
const RankedGamePage = lazy(() => import('@pages/ranked/RankedGamePage'))
const RankedHistoryPage = lazy(() => import('@pages/ranked/RankedHistoryPage'))
const RankedStatsPage = lazy(() => import('@pages/ranked/RankedStatsPage'))

// Rooms (phòng chơi)
const RoomListPage = lazy(() => import('@pages/rooms/RoomListPage'))
const CreateRoomPage = lazy(() => import('@pages/rooms/CreateRoomPage'))
const JoinRoomPage = lazy(() => import('@pages/rooms/JoinRoomPage'))
const RoomGamePage = lazy(() => import('@pages/rooms/RoomPlayPage'))

// Tournaments (giải đấu)
const TournamentListPage = lazy(() => import('@pages/tournaments/TournamentListPage'))
const CreateTournamentPage = lazy(() => import('@pages/tournaments/CreateTournamentPage'))
const TournamentDetailPage = lazy(() => import('@pages/tournaments/TournamentDetailPage'))
const TournamentBracketPage = lazy(() => import('@pages/tournaments/TournamentBracketPage'))
const TournamentMatchPlayPage = lazy(() => import('@pages/tournaments/TournamentMatchPlayPage'))

// Bot
const BotSelectPage = lazy(() => import('@pages/bot/BotSelectPage'))
const BotGamePage = lazy(() => import('@pages/bot/BotGamePage'))

// Replay (xem lại ván đấu)
const ReplayListPage = lazy(() => import('@pages/replay/ReplayListPage'))
const ReplayViewerPage = lazy(() => import('@pages/replay/ReplayViewerPage'))

// =============================================================================
// LOADING SPINNER — Hiển thị khi đang tải trang
// =============================================================================
const PageLoader = () => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 px-4">
    <div className="bg-white/95 border border-gray-200 shadow-lg rounded-lg px-4 py-3">
      <Loader size="sm" text="Đang tải trang..." />
    </div>
  </div>
)

// =============================================================================
// 404 PAGE
// =============================================================================
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#e1edff]">
    <div className="text-center">
      <p className="text-7xl mb-4">♟️</p>
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">Trang không tồn tại</p>
      <Link to="/" className="text-blue-600 hover:underline text-lg">
        ← Về trang chủ
      </Link>
    </div>
  </div>
)

// =============================================================================
// ROUTES CHÍNH
//
// Cấu trúc 3 nhóm:
//
//  1. PUBLIC — Auth pages (login/register) — không có sidebar
//
//  2. APP LAYOUT — Tất cả trang cần sidebar + header
//     ┌ <Route element={<AppLayout />}>   ← Layout bọc ngoài
//     │   <Route path="/dashboard" .../>  ← Trang con (chỉ render nội dung)
//     │   <Route path="/rooms" .../>
//     └   ...
//     Để THÊM TRANG MỚI có sidebar, chỉ thêm <Route> vào trong khối này!
//
//  3. RANKED — Tự quản lý layout bên trong trang nên đứng riêng
// =============================================================================
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* =========================================================
            ROOT — Redirect thẳng vào dashboard
        ========================================================= */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* =========================================================
            AUTH — Trang đăng nhập / đăng ký (không có sidebar)
        ========================================================= */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route path="/logout" element={<LogoutPage />} />

        {/* =========================================================
            RANKED — Trang này tự có MainLayout bên trong
            (Không bọc AppLayout để tránh double-wrap)
        ========================================================= */}
        <Route
          path="/ranked"
          element={
            <PrivateRoute>
              <RankedLobbyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/game/:matchId"
          element={
            <PrivateRoute>
              <RankedGamePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/history"
          element={
            <PrivateRoute>
              <RankedHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/stats"
          element={
            <PrivateRoute>
              <RankedStatsPage />
            </PrivateRoute>
          }
        />

        {/* =========================================================
            BOT GAME — Tự có MainLayout bên trong
            (Không bọc AppLayout để tránh double-wrap)
        ========================================================= */}
        <Route
          path="/bot/game/:gameId"
          element={
            <PrivateRoute>
              <BotGamePage />
            </PrivateRoute>
          }
        />

        {/* =========================================================
            APP LAYOUT — Tất cả trang có Sidebar + Header
            AppLayout tự động wrap Header + Sidebar + Footer.
            Muốn thêm trang mới? Thêm <Route> vào trong đây!
        ========================================================= */}
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />

          {/* Phòng chơi */}
          <Route path="/rooms" element={<RoomListPage />} />
          <Route path="/rooms/create" element={<CreateRoomPage />} />
          <Route path="/rooms/join" element={<JoinRoomPage />} />
          <Route path="/rooms/:roomId" element={<RoomGamePage />} />

          {/* Giải đấu */}
          <Route path="/tournaments" element={<TournamentListPage />} />
          <Route path="/tournaments/create" element={<CreateTournamentPage />} />
          <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
          <Route path="/tournaments/:tournamentId/bracket" element={<TournamentBracketPage />} />
          <Route
            path="/tournaments/:tournamentId/matches/:gameId/play"
            element={<TournamentMatchPlayPage />}
          />

          {/* Chơi với Bot */}
          <Route path="/bot" element={<BotSelectPage />} />

          {/* Replay */}
          <Route path="/replays" element={<ReplayListPage />} />
          <Route path="/replays/:gameId" element={<ReplayViewerPage />} />
        </Route>

        {/* =========================================================
            404 — Không tìm thấy trang
        ========================================================= */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
