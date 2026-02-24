import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'
import PrivateRoute from './PrivateRoute'
import PublicRoute from './PublicRoute'

// ============================================
// DEMO PAGES (For testing components)
// ============================================
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
// const RankedLobbyPage = lazy(() => import('@pages/ranked/RankedLobbyPage'))
// const RankedGamePage = lazy(() => import('@pages/ranked/RankedGamePage'))
// const RankedHistoryPage = lazy(() => import('@pages/ranked/RankedHistoryPage'))
// const RankedStatsPage = lazy(() => import('@pages/ranked/RankedStatsPage'))

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
// const BotSelectPage = lazy(() => import('@pages/bot/BotSelectPage'))
// const BotGamePage = lazy(() => import('@pages/bot/BotGamePage'))

// Replay Pages (Team Member 4)
// const ReplayListPage = lazy(() => import('@pages/replay/ReplayListPage'))
// const ReplayViewerPage = lazy(() => import('@pages/replay/ReplayViewerPage'))

// Home Pages
// const HomePage = lazy(() => import('@pages/home/HomePage'))
// const DashboardPage = lazy(() => import('@pages/home/DashboardPage'))

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
// TEMPORARY HOME PAGE
// ============================================
const HomePage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
    <div className="text-center text-white max-w-4xl px-4">
      <h1 className="text-6xl font-bold mb-4">♟️ ChessWeb</h1>
      <p className="text-2xl mb-8">Play Chess Online</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <a href="/login" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">🔐</div>
          <div>Login</div>
        </a>
        <a
          href="/logout"
          className="bg-red-500/30 hover:bg-red-500/50 rounded-lg p-4 transition border-2 border-red-400"
        >
          <div className="text-3xl mb-2">🚪</div>
          <div>Logout / Clear</div>
        </a>
        <a href="/ranked" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">🏆</div>
          <div>Ranked</div>
        </a>
        <a href="/rooms" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">👥</div>
          <div>Rooms</div>
        </a>
        <a href="/tournaments" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">🎯</div>
          <div>Tournaments</div>
        </a>
        <a href="/bot" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">🤖</div>
          <div>vs Bot</div>
        </a>
        <a href="/replays" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
          <div className="text-3xl mb-2">📹</div>
          <div>Replays</div>
        </a>
      </div>

      <div className="space-x-4">
        <a
          href="/demo"
          className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          View Component Demos
        </a>
      </div>

      {/* TEST ROUTES - Member 1 (Auth & Profile) */}
      <div className="mt-8 pt-8 border-t border-white/20">
        <p className="text-sm mb-3 text-white/80">
          🧪 Test Pages — Member 1: Auth &amp; Profile (No Login Required)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <a
            href="/login"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Login
          </a>
          <a
            href="/register"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Register
          </a>
          <a
            href="/forgot-password"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Forgot Password
          </a>
          <a
            href="/test/auth/profile"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Profile
          </a>
          <a
            href="/test/auth/profile/edit"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Edit Profile
          </a>
          <a
            href="/leaderboard"
            className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400"
          >
            Leaderboard
          </a>
          <button
            onClick={() => {
              localStorage.setItem('token', 'dev-fake-token')
              localStorage.setItem(
                'user',
                JSON.stringify({
                  id: 1,
                  username: 'testuser',
                  displayName: 'Test User',
                  email: 'test@example.com',
                  avatarUrl: 'https://i.pravatar.cc/150?img=1',
                  rating: 1500,
                })
              )
              window.location.href = '/test/auth/profile'
            }}
            className="bg-green-500/40 hover:bg-green-500/60 rounded-lg p-3 text-sm transition border-2 border-green-400 font-bold col-span-2"
          >
            ⚡ Dev Quick Login → Profile
          </button>
        </div>
      </div>

      {/* TEST ROUTES - Member 3 */}
      <div className="mt-8 pt-8 border-t border-white/20">
        <p className="text-sm mb-4 text-white/80">
          🧪 Test Pages — Member 3: Rooms &amp; Tournaments (No Login Required)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href="/test/rooms"
            className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400"
          >
            Rooms List
          </a>
          <a
            href="/test/rooms/create"
            className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400"
          >
            Create Room
          </a>
          <a
            href="/test/rooms/join"
            className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400"
          >
            Join Room
          </a>
          <a
            href="/test/rooms/game"
            className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400"
          >
            Room Game
          </a>
          <a
            href="/test/tournaments"
            className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400"
          >
            Tournaments
          </a>
          <a
            href="/test/tournaments/create"
            className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400"
          >
            Create Tournament
          </a>
          <a
            href="/test/tournaments/detail"
            className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400"
          >
            Tournament Detail
          </a>
          <a
            href="/test/tournaments/bracket"
            className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400"
          >
            Tournament Bracket
          </a>
        </div>
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
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PlaceholderPage title="Dashboard" module="Home" assignedTo="To be decided" />
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
              <PlaceholderPage
                title="Ranked Lobby"
                module="Ranked Match"
                assignedTo="Team Member 2"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/game/:matchId"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Ranked Game"
                module="Ranked Match"
                assignedTo="Team Member 2"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/history"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Ranked History"
                module="Ranked Match"
                assignedTo="Team Member 2"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranked/stats"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Ranked Stats"
                module="Ranked Match"
                assignedTo="Team Member 2"
              />
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
              <PlaceholderPage title="Bot Select" module="Play vs Bot" assignedTo="Team Member 4" />
            </PrivateRoute>
          }
        />
        <Route
          path="/bot/game/:gameId"
          element={
            <PrivateRoute>
              <PlaceholderPage title="Bot Game" module="Play vs Bot" assignedTo="Team Member 4" />
            </PrivateRoute>
          }
        />

        {/* ==================== REPLAY ROUTES ==================== */}
        <Route
          path="/replays"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Replay List"
                module="Replay System"
                assignedTo="Team Member 4"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/replays/:gameId"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Replay Viewer"
                module="Replay System"
                assignedTo="Team Member 4"
              />
            </PrivateRoute>
          }
        />

        {/* ==================== DEMO ROUTES ==================== */}
        <Route path="/demo" element={<GameComponentsDemo />} />
        <Route path="/demo/game" element={<GameComponentsDemo />} />
        <Route path="/demo/components" element={<CommonComponentsDemo />} />

        {/* ==================== TEST ROUTES - Member 3 ==================== */}
        {/* Route test riêng KHÔNG CẦN LOGIN - chỉ để test UI */}

        {/* ==================== TEST ROUTES - Member 1 (No Login) ==================== */}
        <Route path="/test/auth/profile" element={<ProfilePage />} />
        <Route path="/test/auth/profile/edit" element={<EditProfilePage />} />
        <Route path="/test/auth/leaderboard" element={<LeaderboardPage />} />

        {/* ==================== TEST ROUTES - Member 3 ==================== */}
        <Route path="/test/rooms" element={<RoomListPage />} />
        <Route path="/test/rooms/create" element={<CreateRoomPage />} />
        <Route path="/test/rooms/join" element={<JoinRoomPage />} />
        <Route path="/test/rooms/game" element={<RoomGamePage />} />
        <Route path="/test/tournaments" element={<TournamentListPage />} />
        <Route path="/test/tournaments/create" element={<CreateTournamentPage />} />
        <Route path="/test/tournaments/detail" element={<TournamentDetailPage />} />
        <Route path="/test/tournaments/bracket" element={<TournamentBracketPage />} />

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
