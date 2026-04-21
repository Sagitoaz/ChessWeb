/**
 * TestLinksPage - Trang test links cho development
 * 
 * Trang này chứa tất cả test routes để dev có thể test pages
 * mà không cần login hoặc authentication
 */

import { Link } from 'react-router-dom'

export default function TestLinksPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white max-w-4xl px-4">
        <h1 className="text-6xl font-bold mb-4">♟️ ChessWeb - Test Hub</h1>
        <p className="text-2xl mb-8">Development & Testing Links</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Link to="/" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🏠</div>
            <div>Home</div>
          </Link>
          <Link to="/test/auth/login" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🔐</div>
            <div>Login</div>
          </Link>
          <Link to="/test/auth/register" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">📝</div>
            <div>Register</div>
          </Link>
          <Link to="/logout"
            className="bg-red-500/30 hover:bg-red-500/50 rounded-lg p-4 transition border-2 border-red-400"
          >
            <div className="text-3xl mb-2">🚪</div>
            <div>Logout / Clear</div>
          </Link>
          <Link to="/ranked" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🏆</div>
            <div>Ranked</div>
          </Link>
          <Link to="/rooms" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">👥</div>
            <div>Rooms</div>
          </Link>
          <Link to="/tournaments" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🎯</div>
            <div>Tournaments</div>
          </Link>
          <Link to="/bot" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🤖</div>
            <div>vs Bot</div>
          </Link>
          <Link to="/replays" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">📹</div>
            <div>Replays</div>
          </Link>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Link to="/demo" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
            🎮 Demo Hub
          </Link>
        </div>

        {/* TEST ROUTES - Member 1 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-3 text-white/80">
            🧪 Test Pages — Member 1: Auth &amp; Profile (No Login Required)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Link to="/test/auth/login" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Login Page</Link>
            <Link to="/test/auth/register" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Register Page</Link>
            <Link to="/test/auth/profile" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Profile</Link>
            <Link to="/test/auth/profile/edit" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Edit Profile</Link>
            <Link to="/leaderboard" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Leaderboard</Link>
            <button
              onClick={() => {
                localStorage.setItem('token', 'dev-fake-token')
                localStorage.setItem('user', JSON.stringify({
                  id: 1, username: 'testuser', displayName: 'Test User',
                  email: 'test@example.com', avatarUrl: 'https://i.pravatar.cc/150?img=1',
                  rating: 1500, wins: 10, losses: 5, gamesPlayed: 18,
                }))
                window.location.hash = '#/test/auth/profile'
              }}
              className="bg-green-500/40 hover:bg-green-500/60 rounded-lg p-3 text-sm transition border-2 border-green-400 font-bold col-span-2"
            >
              ⚡ Dev Quick Login
            </button>
          </div>
        </div>

        {/* TEST ROUTES - Member 2 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-3 text-white/80">🧪 Test Pages — Member 2: Ranked Match</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Link to="/test/ranked" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Lobby</Link>
            <Link to="/test/ranked/game" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Game</Link>
            <Link to="/test/ranked/history" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked History</Link>
            <Link to="/test/ranked/stats" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Stats</Link>
          </div>
        </div>

        {/* TEST ROUTES - Member 3 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-4 text-white/80">🧪 Test Pages — Member 3: Rooms &amp; Tournaments</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/test/rooms" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Rooms List</Link>
            <Link to="/test/rooms/create" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Create Room</Link>
            <Link to="/test/rooms/join" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Join Room</Link>
            <Link to="/test/rooms/game" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Room Game</Link>
            <Link to="/test/tournaments" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournaments</Link>
            <Link to="/test/tournaments/create" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Create Tournament</Link>
            <Link to="/test/tournaments/detail" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournament Detail</Link>
            <Link to="/test/tournaments/bracket" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournament Bracket</Link>
          </div>
        </div>

        {/* TEST ROUTES - Member 4 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-4 text-white/80">🧪 Test Pages — Member 4: Bot &amp; Replay</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/test/bot" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Bot Select</Link>
            <Link to="/test/bot/game" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Bot Game</Link>
            <Link to="/test/replays" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Replay List</Link>
            <Link to="/test/replays/viewer" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Replay Viewer</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
