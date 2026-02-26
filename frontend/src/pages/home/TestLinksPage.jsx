/**
 * TestLinksPage - Trang test links cho development
 * 
 * Trang này chứa tất cả test routes để dev có thể test pages
 * mà không cần login hoặc authentication
 */

export default function TestLinksPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white max-w-4xl px-4">
        <h1 className="text-6xl font-bold mb-4">♟️ ChessWeb - Test Hub</h1>
        <p className="text-2xl mb-8">Development & Testing Links</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <a href="/" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🏠</div>
            <div>Home</div>
          </a>
          <a href="/test/auth/login" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">🔐</div>
            <div>Login</div>
          </a>
          <a href="/test/auth/register" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition">
            <div className="text-3xl mb-2">📝</div>
            <div>Register</div>
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
        
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <a href="/demo" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
            🎮 Demo Hub
          </a>
        </div>

        {/* TEST ROUTES - Member 1 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-3 text-white/80">
            🧪 Test Pages — Member 1: Auth &amp; Profile (No Login Required)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <a href="/test/auth/login" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Login Page</a>
            <a href="/test/auth/register" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Register Page</a>
            <a href="/test/auth/profile" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Profile</a>
            <a href="/test/auth/profile/edit" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Edit Profile</a>
            <a href="/leaderboard" className="bg-blue-500/30 hover:bg-blue-500/50 rounded-lg p-3 text-sm transition border border-blue-400">Leaderboard</a>
            <button
              onClick={() => {
                localStorage.setItem('token', 'dev-fake-token')
                localStorage.setItem('user', JSON.stringify({
                  id: 1, username: 'testuser', displayName: 'Test User',
                  email: 'test@example.com', avatarUrl: 'https://i.pravatar.cc/150?img=1',
                  rating: 1500, wins: 10, losses: 5, gamesPlayed: 18,
                }))
                window.location.href = '/test/auth/profile'
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
            <a href="/test/ranked" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Lobby</a>
            <a href="/test/ranked/game" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Game</a>
            <a href="/test/ranked/history" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked History</a>
            <a href="/test/ranked/stats" className="bg-orange-500/30 hover:bg-orange-500/50 rounded-lg p-3 text-sm transition border border-orange-400">Ranked Stats</a>
          </div>
        </div>

        {/* TEST ROUTES - Member 3 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-4 text-white/80">🧪 Test Pages — Member 3: Rooms &amp; Tournaments</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/test/rooms" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Rooms List</a>
            <a href="/test/rooms/create" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Create Room</a>
            <a href="/test/rooms/join" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Join Room</a>
            <a href="/test/rooms/game" className="bg-green-500/30 hover:bg-green-500/50 rounded-lg p-3 text-sm transition border border-green-400">Room Game</a>
            <a href="/test/tournaments" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournaments</a>
            <a href="/test/tournaments/create" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Create Tournament</a>
            <a href="/test/tournaments/detail" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournament Detail</a>
            <a href="/test/tournaments/bracket" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Tournament Bracket</a>
          </div>
        </div>

        {/* TEST ROUTES - Member 4 */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm mb-4 text-white/80">🧪 Test Pages — Member 4: Bot &amp; Replay</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/test/bot" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Bot Select</a>
            <a href="/test/bot/game" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Bot Game</a>
            <a href="/test/replays" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Replay List</a>
            <a href="/test/replays/viewer" className="bg-purple-500/30 hover:bg-purple-500/50 rounded-lg p-3 text-sm transition border border-purple-400">Replay Viewer</a>
          </div>
        </div>
      </div>
    </div>
  )
}
