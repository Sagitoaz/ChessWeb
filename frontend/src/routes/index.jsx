import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'
import PrivateRoute from './PrivateRoute'
import PublicRoute from './PublicRoute'

// ============================================
// DEMO PAGES (For testing components)
// ============================================
const DemoHubPage = lazy(() => import('@pages/demo/DemoHubPage'))
const GameComponentsDemo = lazy(() => import('@pages/demo/GameComponentsDemo'))
const CommonComponentsDemo = lazy(() => import('@pages/demo/CommonComponentsDemo'))

// ============================================
// TODO: PAGES TO BE IMPLEMENTED BY TEAM
// ============================================
// Auth Pages (Team Member 1)
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const LogoutPage = lazy(() => import('@pages/auth/LogoutPage'))
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'))

// Profile Pages (Team Member 1)
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'))
const EditProfilePage = lazy(() => import('@pages/profile/EditProfilePage'))
const LeaderboardPage = lazy(() => import('@pages/profile/LeaderboardPage'))

// Ranked Pages (Team Member 2)
const RankedLobbyPage = lazy(() => import('@pages/ranked/RankedLobbyPage'))
const RankedGamePage = lazy(() => import('@pages/ranked/RankedGamePage'))
const RankedHistoryPage = lazy(() => import('@pages/ranked/RankedHistoryPage'))
const RankedStatsPage = lazy(() => import('@pages/ranked/RankedStatsPage'))

// Room Pages (Team Member 3)
const RoomListPage = lazy(() => import('@pages/rooms/RoomListPage'))
const CreateRoomPage = lazy(() => import('@pages/rooms/CreateRoomPage'))
const JoinRoomPage = lazy(() => import('@pages/rooms/JoinRoomPage'))
const RoomGamePage = lazy(() => import('@pages/rooms/RoomGamePage'))

// Tournament Pages (Team Member 3)
const TournamentListPage = lazy(() => import('@pages/tournaments/TournamentListPage'))
const CreateTournamentPage = lazy(() => import('@pages/tournaments/CreateTournamentPage'))
const TournamentDetailPage = lazy(() => import('@pages/tournaments/TournamentDetailPage'))
const TournamentBracketPage = lazy(() => import('@pages/tournaments/TournamentBracketPage'))

// Bot Pages (Team Member 4)
const BotSelectPage = lazy(() => import('@pages/bot/BotSelectPage'))
const BotGamePage = lazy(() => import('@pages/bot/BotGamePage'))

// Replay Pages (Team Member 4)
const ReplayListPage = lazy(() => import('@pages/replay/ReplayListPage'))
const ReplayViewerPage = lazy(() => import('@pages/replay/ReplayViewerPage'))

// Home Pages
const HomePage = lazy(() => import('@pages/home/HomePage'))
const DashboardPage = lazy(() => import('@pages/home/DashboardPage'))
const TestLinksPage = lazy(() => import('@pages/home/TestLinksPage'))

// ============================================
// LOADING COMPONENT
// ============================================
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <Loader size="lg" text="Loading..." />
  </div>
)

// ============================================
// PLACEHOLDER COMPONENTS (Temporary until pages are implemented)
// ============================================
const PlaceholderPage = ({ title, module, assignedTo }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center max-w-md">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600 mb-2">🚧 To be implemented</p>
      <p className="text-sm text-gray-500">Module: {module}</p>
      <p className="text-sm text-gray-500">Assigned to: {assignedTo}</p>
      <div className="mt-6">
        <a href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </a>
      </div>
    </div>
  </div>
)



// ============================================
// MAIN ROUTES COMPONENT
// ============================================
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ==================== HOME ==================== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/testlinks" element={<TestLinksPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        {/* ==================== PUBLIC ROUTES (Auth) ==================== */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route path="/logout" element={<LogoutPage />} />
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

        {/* ==================== PROFILE ROUTES ==================== */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <PrivateRoute>
              <EditProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        {/* ==================== RANKED ROUTES ==================== */}
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

        {/* ==================== ROOM ROUTES ==================== */}
        <Route
          path="/rooms"
          element={
            <PrivateRoute>
              <RoomListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/create"
          element={
            <PrivateRoute>
              <CreateRoomPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/join"
          element={
            <PrivateRoute>
              <JoinRoomPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <PrivateRoute>
              <RoomGamePage />
            </PrivateRoute>
          }
        />

        {/* ==================== TOURNAMENT ROUTES ==================== */}
        <Route
          path="/tournaments"
          element={
            <PrivateRoute>
              <TournamentListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/create"
          element={
            <PrivateRoute>
              <CreateTournamentPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId"
          element={
            <PrivateRoute>
              <TournamentDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId/bracket"
          element={
            <PrivateRoute>
              <TournamentBracketPage />
            </PrivateRoute>
          }
        />

        {/* ==================== BOT ROUTES ==================== */}
        <Route
          path="/bot"
          element={
            <PrivateRoute>
              <BotSelectPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/bot/game/:gameId"
          element={
            <PrivateRoute>
              <BotGamePage />
            </PrivateRoute>
          }
        />

        {/* ==================== REPLAY ROUTES ==================== */}
        <Route
          path="/replays"
          element={
            <PrivateRoute>
              <ReplayListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/replays/:gameId"
          element={
            <PrivateRoute>
              <ReplayViewerPage />
            </PrivateRoute>
          }
        />

        {/* ==================== DEMO ROUTES ==================== */}
        <Route path="/demo" element={<DemoHubPage />} />
        <Route path="/demo/game" element={<GameComponentsDemo />} />
        <Route path="/demo/components" element={<CommonComponentsDemo />} />
        <Route path="/demo/ranked" element={<RankedLobbyPage />} />
        <Route path="/demo/ranked/game" element={<RankedGamePage />} />
        <Route path="/demo/ranked/game/:matchId" element={<RankedGamePage />} />
        <Route path="/demo/ranked/history" element={<RankedHistoryPage />} />
        <Route path="/demo/ranked/stats" element={<RankedStatsPage />} />

        {/* ==================== TEST ROUTES - Member 3 ==================== */}
        {/* Route test riêng KHÔNG CẦN LOGIN - chỉ để test UI */}

        {/* ==================== TEST ROUTES - Member 1 (No Login) ==================== */}
        <Route path="/test/auth/login" element={<LoginPage />} />
        <Route path="/test/auth/register" element={<RegisterPage />} />
        <Route path="/test/auth/profile" element={<ProfilePage />} />
        <Route path="/test/auth/profile/edit" element={<EditProfilePage />} />
        <Route path="/test/auth/leaderboard" element={<LeaderboardPage />} />

        {/* ==================== TEST ROUTES - Member 2 (No Login) ==================== */}
        <Route path="/test/ranked" element={<RankedLobbyPage />} />
        <Route path="/test/ranked/game" element={<RankedGamePage />} />
        <Route path="/test/ranked/game/:matchId" element={<RankedGamePage />} />
        <Route path="/test/ranked/history" element={<RankedHistoryPage />} />
        <Route path="/test/ranked/stats" element={<RankedStatsPage />} />

        {/* ==================== TEST ROUTES - Member 3 (No Login) ==================== */}
        <Route path="/test/rooms" element={<RoomListPage />} />
        <Route path="/test/rooms/create" element={<CreateRoomPage />} />
        <Route path="/test/rooms/join" element={<JoinRoomPage />} />
        <Route path="/test/rooms/game" element={<RoomGamePage />} />
        <Route path="/test/tournaments" element={<TournamentListPage />} />
        <Route path="/test/tournaments/create" element={<CreateTournamentPage />} />
        <Route path="/test/tournaments/detail" element={<TournamentDetailPage />} />
        <Route path="/test/tournaments/bracket" element={<TournamentBracketPage />} />

        {/* ==================== TEST ROUTES - Member 4 (No Login) ==================== */}
        <Route path="/test/bot" element={<BotSelectPage />} />
        <Route path="/test/bot/game" element={<BotGamePage />} />
        <Route path="/test/bot/game/:gameId" element={<BotGamePage />} />
        <Route path="/test/replays" element={<ReplayListPage />} />
        <Route path="/test/replays/viewer" element={<ReplayViewerPage />} />
        <Route path="/test/replays/:gameId" element={<ReplayViewerPage />} />

        {/* ==================== 404 ==================== */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-6">Page Not Found</p>
                <a href="/" className="text-blue-600 hover:underline">
                  ← Back to Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
