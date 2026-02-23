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
// const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'))

// Profile Pages (Team Member 1)
// const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'))
// const EditProfilePage = lazy(() => import('@pages/profile/EditProfilePage'))
// const LeaderboardPage = lazy(() => import('@pages/profile/LeaderboardPage'))

// Ranked Pages (Team Member 2)
// const RankedLobbyPage = lazy(() => import('@pages/ranked/RankedLobbyPage'))
// const RankedGamePage = lazy(() => import('@pages/ranked/RankedGamePage'))
// const RankedHistoryPage = lazy(() => import('@pages/ranked/RankedHistoryPage'))
// const RankedStatsPage = lazy(() => import('@pages/ranked/RankedStatsPage'))

// Room Pages (Team Member 3)
// const RoomListPage = lazy(() => import('@pages/rooms/RoomListPage'))
// const CreateRoomPage = lazy(() => import('@pages/rooms/CreateRoomPage'))
// const JoinRoomPage = lazy(() => import('@pages/rooms/JoinRoomPage'))
// const RoomGamePage = lazy(() => import('@pages/rooms/RoomGamePage'))

// Tournament Pages (Team Member 3)
// const TournamentListPage = lazy(() => import('@pages/tournaments/TournamentListPage'))
// const CreateTournamentPage = lazy(() => import('@pages/tournaments/CreateTournamentPage'))
// const TournamentDetailPage = lazy(() => import('@pages/tournaments/TournamentDetailPage'))
// const TournamentBracketPage = lazy(() => import('@pages/tournaments/TournamentBracketPage'))

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
        <Route
          path="/register"
          element={
            <PublicRoute>
              <PlaceholderPage
                title="Register Page"
                module="Auth & Profile"
                assignedTo="Team Member 1"
              />
            </PublicRoute>
          }
        />

        {/* ==================== PROFILE ROUTES ==================== */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Profile Page"
                module="Auth & Profile"
                assignedTo="Team Member 1"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Edit Profile Page"
                module="Auth & Profile"
                assignedTo="Team Member 1"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PlaceholderPage
              title="Leaderboard Page"
              module="Auth & Profile"
              assignedTo="Team Member 1"
            />
          }
        />

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
              <PlaceholderPage title="Room List" module="Friend Rooms" assignedTo="Team Member 3" />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/create"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Create Room"
                module="Friend Rooms"
                assignedTo="Team Member 3"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/join"
          element={
            <PrivateRoute>
              <PlaceholderPage title="Join Room" module="Friend Rooms" assignedTo="Team Member 3" />
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <PrivateRoute>
              <PlaceholderPage title="Room Game" module="Friend Rooms" assignedTo="Team Member 3" />
            </PrivateRoute>
          }
        />

        {/* ==================== TOURNAMENT ROUTES ==================== */}
        <Route
          path="/tournaments"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Tournament List"
                module="Tournaments"
                assignedTo="Team Member 3"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/create"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Create Tournament"
                module="Tournaments"
                assignedTo="Team Member 3"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Tournament Detail"
                module="Tournaments"
                assignedTo="Team Member 3"
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId/bracket"
          element={
            <PrivateRoute>
              <PlaceholderPage
                title="Tournament Bracket"
                module="Tournaments"
                assignedTo="Team Member 3"
              />
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
