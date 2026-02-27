import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'
import { AppLayout } from '@components/layout'
import PublicRoute from './PublicRoute'

// =============================================================================
// LAZY IMPORTS — Mỗi trang được tải khi người dùng truy cập (tối ưu tốc độ)
// =============================================================================

// Auth Pages (đăng nhập / đăng ký)
const LoginPage          = lazy(() => import('@pages/auth/LoginPage'))
const LogoutPage         = lazy(() => import('@pages/auth/LogoutPage'))
const RegisterPage       = lazy(() => import('@pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'))

// Home
const HomePage     = lazy(() => import('@pages/home/HomePage'))
const DashboardPage = lazy(() => import('@pages/home/DashboardPage'))

// Profile
const ProfilePage    = lazy(() => import('@pages/profile/ProfilePage'))
const EditProfilePage = lazy(() => import('@pages/profile/EditProfilePage'))
const LeaderboardPage = lazy(() => import('@pages/profile/LeaderboardPage'))

// Ranked — những trang này quản lý layout BÊN TRONG nên không cần AppLayout bọc ngoài
const RankedLobbyPage   = lazy(() => import('@pages/ranked/RankedLobbyPage'))
const RankedGamePage    = lazy(() => import('@pages/ranked/RankedGamePage'))
const RankedHistoryPage = lazy(() => import('@pages/ranked/RankedHistoryPage'))
const RankedStatsPage   = lazy(() => import('@pages/ranked/RankedStatsPage'))

// Rooms (phòng chơi)
const RoomListPage   = lazy(() => import('@pages/rooms/RoomListPage'))
const CreateRoomPage = lazy(() => import('@pages/rooms/CreateRoomPage'))
const JoinRoomPage   = lazy(() => import('@pages/rooms/JoinRoomPage'))
const RoomGamePage   = lazy(() => import('@pages/rooms/RoomGamePage'))

// Tournaments (giải đấu)
const TournamentListPage    = lazy(() => import('@pages/tournaments/TournamentListPage'))
const CreateTournamentPage  = lazy(() => import('@pages/tournaments/CreateTournamentPage'))
const TournamentDetailPage  = lazy(() => import('@pages/tournaments/TournamentDetailPage'))
const TournamentBracketPage = lazy(() => import('@pages/tournaments/TournamentBracketPage'))

// Bot
const BotSelectPage = lazy(() => import('@pages/bot/BotSelectPage'))
const BotGamePage   = lazy(() => import('@pages/bot/BotGamePage'))

// Replay (xem lại ván đấu)
const ReplayListPage   = lazy(() => import('@pages/replay/ReplayListPage'))
const ReplayViewerPage = lazy(() => import('@pages/replay/ReplayViewerPage'))

// Demo (dùng để test component — không cần auth)
const DemoHubPage          = lazy(() => import('@pages/demo/DemoHubPage'))
const GameComponentsDemo   = lazy(() => import('@pages/demo/GameComponentsDemo'))
const CommonComponentsDemo = lazy(() => import('@pages/demo/CommonComponentsDemo'))

// =============================================================================
// LOADING SPINNER — Hiển thị khi đang tải trang
// =============================================================================
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <Loader size="lg" text="Đang tải..." />
  </div>
)

// =============================================================================
// 404 PAGE
// =============================================================================
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <p className="text-7xl mb-4">♟️</p>
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">Trang không tồn tại</p>
      <a href="/" className="text-blue-600 hover:underline text-lg">← Về trang chủ</a>
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
            TRANG CHỦ (không cần auth)
        ========================================================= */}
        <Route path="/" element={<HomePage />} />

        {/* =========================================================
            AUTH — Trang đăng nhập / đăng ký (không có sidebar)
        ========================================================= */}
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/logout"          element={<LogoutPage />} />

        {/* =========================================================
            RANKED — Trang này tự có MainLayout bên trong
            (Không bọc AppLayout để tránh double-wrap)
        ========================================================= */}
        <Route path="/ranked"                element={<RankedLobbyPage />} />
        <Route path="/ranked/game/:matchId"  element={<RankedGamePage />} />
        <Route path="/ranked/history"        element={<RankedHistoryPage />} />
        <Route path="/ranked/stats"          element={<RankedStatsPage />} />

        {/* =========================================================
            APP LAYOUT — Tất cả trang có Sidebar + Header
            AppLayout tự động wrap Header + Sidebar + Footer.
            Muốn thêm trang mới? Thêm <Route> vào trong đây!
        ========================================================= */}
        <Route element={<AppLayout />}>

          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Profile */}
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/leaderboard"  element={<LeaderboardPage />} />

          {/* Phòng chơi */}
          <Route path="/rooms"           element={<RoomListPage />} />
          <Route path="/rooms/create"    element={<CreateRoomPage />} />
          <Route path="/rooms/join"      element={<JoinRoomPage />} />
          <Route path="/rooms/:roomId"   element={<RoomGamePage />} />

          {/* Giải đấu */}
          <Route path="/tournaments"                          element={<TournamentListPage />} />
          <Route path="/tournaments/create"                   element={<CreateTournamentPage />} />
          <Route path="/tournaments/:tournamentId"            element={<TournamentDetailPage />} />
          <Route path="/tournaments/:tournamentId/bracket"    element={<TournamentBracketPage />} />

          {/* Chơi với Bot */}
          <Route path="/bot"               element={<BotSelectPage />} />
          <Route path="/bot/game/:gameId"  element={<BotGamePage />} />

          {/* Replay */}
          <Route path="/replays"           element={<ReplayListPage />} />
          <Route path="/replays/:gameId"   element={<ReplayViewerPage />} />

        </Route>

        {/* =========================================================
            TEST ROUTES — Truy cập không cần login (chỉ để test UI)
            Các trang auth test không cần sidebar nên đứng riêng.
            Các trang khác đặt dưới AppLayout để test đúng giao diện.
        ========================================================= */}

        {/* Test auth — standalone (không sidebar) */}
        <Route path="/test/auth/login"    element={<LoginPage />} />
        <Route path="/test/auth/register" element={<RegisterPage />} />

        {/* Test các trang có sidebar — dùng AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/test/auth/profile"      element={<ProfilePage />} />
          <Route path="/test/auth/profile/edit" element={<EditProfilePage />} />
          <Route path="/test/auth/leaderboard"  element={<LeaderboardPage />} />

          <Route path="/test/rooms"             element={<RoomListPage />} />
          <Route path="/test/rooms/create"      element={<CreateRoomPage />} />
          <Route path="/test/rooms/join"        element={<JoinRoomPage />} />
          <Route path="/test/rooms/game"        element={<RoomGamePage />} />

          <Route path="/test/tournaments"         element={<TournamentListPage />} />
          <Route path="/test/tournaments/create"  element={<CreateTournamentPage />} />
          <Route path="/test/tournaments/detail"  element={<TournamentDetailPage />} />
          <Route path="/test/tournaments/bracket" element={<TournamentBracketPage />} />

          <Route path="/test/bot"                element={<BotSelectPage />} />
          <Route path="/test/bot/game"           element={<BotGamePage />} />
          <Route path="/test/bot/game/:gameId"   element={<BotGamePage />} />

          <Route path="/test/replays"            element={<ReplayListPage />} />
          <Route path="/test/replays/viewer"     element={<ReplayViewerPage />} />
          <Route path="/test/replays/:gameId"    element={<ReplayViewerPage />} />
        </Route>

        {/* Test ranked — standalone (có layout riêng bên trong) */}
        <Route path="/test/ranked"                   element={<RankedLobbyPage />} />
        <Route path="/test/ranked/game"              element={<RankedGamePage />} />
        <Route path="/test/ranked/game/:matchId"     element={<RankedGamePage />} />
        <Route path="/test/ranked/history"           element={<RankedHistoryPage />} />
        <Route path="/test/ranked/stats"             element={<RankedStatsPage />} />

        {/* =========================================================
            DEMO — Component showcase (không cần auth)
        ========================================================= */}
        <Route path="/demo"                    element={<DemoHubPage />} />
        <Route path="/demo/game"               element={<GameComponentsDemo />} />
        <Route path="/demo/components"         element={<CommonComponentsDemo />} />
        <Route path="/demo/ranked"             element={<RankedLobbyPage />} />
        <Route path="/demo/ranked/game"        element={<RankedGamePage />} />
        <Route path="/demo/ranked/game/:matchId" element={<RankedGamePage />} />
        <Route path="/demo/ranked/history"     element={<RankedHistoryPage />} />
        <Route path="/demo/ranked/stats"       element={<RankedStatsPage />} />

        {/* =========================================================
            404 — Không tìm thấy trang
        ========================================================= */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </Suspense>
  )
}


export default AppRoutes
