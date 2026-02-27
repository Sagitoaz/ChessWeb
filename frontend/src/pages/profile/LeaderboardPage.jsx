import { useState } from 'react'
import { Link } from 'react-router-dom'
import MOCK_DATA from '@/mocks/users.json'

// ── Expand mock leaderboard ───────────────────────────────────────────────
const MOCK_LEADERBOARD = [
  ...MOCK_DATA.leaderboard,
  { rank: 4, username: 'SilverRook', rating: 2200, gamesPlayed: 350, winRate: 68 },
  { rank: 5, username: 'NightRider', rating: 2150, gamesPlayed: 300, winRate: 65 },
  { rank: 6, username: 'KnightSlayer', rating: 2100, gamesPlayed: 280, winRate: 64 },
  { rank: 7, username: 'PawnStorm', rating: 2050, gamesPlayed: 260, winRate: 62 },
  { rank: 8, username: 'EndgamePro', rating: 2000, gamesPlayed: 240, winRate: 60 },
  { rank: 9, username: 'chesslover', rating: 1520, gamesPlayed: 87, winRate: 52, isMe: true },
  { rank: 10, username: 'NewPlayer', rating: 1200, gamesPlayed: 30, winRate: 40 },
]

const PodiumCard = ({ entry, size }) => {
  const podiumStyles = {
    1: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    2: 'bg-gray-50 border-gray-300 text-gray-600',
    3: 'bg-orange-50 border-orange-200 text-orange-600',
  }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-2xl border-2 ${podiumStyles[entry.rank]} ${size === 'lg' ? 'scale-105' : ''}`}
    >
      <div className="text-3xl mb-1">{medals[entry.rank]}</div>
      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-gray-700 mb-1">
        {entry.username[0].toUpperCase()}
      </div>
      <p className="text-sm font-bold text-gray-900">{entry.username}</p>
      <p className="text-lg font-extrabold mt-0.5">{entry.rating}</p>
    </div>
  )
}

const LeaderboardPage = () => {
  const [search, setSearch] = useState('')

  const filtered = MOCK_LEADERBOARD.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const top3 = MOCK_LEADERBOARD.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="pb-12">
        <div className="max-w-3xl mx-auto px-4 pt-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900">🏆 Bảng xếp hạng</h1>
            <p className="text-sm text-gray-500 mt-1">Top kỳ thủ WebChess</p>
          </div>

          {/* Podium */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto">
            <PodiumCard entry={top3[1]} />
            <PodiumCard entry={top3[0]} size="lg" />
            <PodiumCard entry={top3[2]} />
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Tìm người chơi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-3 px-4 text-left w-12">#</th>
                  <th className="py-3 px-4 text-left">Người chơi</th>
                  <th className="py-3 px-4 text-right">Rating</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">Ván</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">Thắng %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`border-t border-gray-50 hover:bg-gray-50 transition ${
                      entry.isMe ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-400 font-mono">{entry.rank}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {entry.username[0].toUpperCase()}
                        </div>
                        <span className={entry.isMe ? 'text-blue-600' : 'text-gray-900'}>
                          {entry.username}
                          {entry.isMe && (
                            <span className="ml-1.5 text-xs bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full">
                              bạn
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                      {entry.rating}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">
                      {entry.gamesPlayed}
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell">
                      <span
                        className={`font-semibold ${entry.winRate >= 60 ? 'text-green-600' : entry.winRate >= 50 ? 'text-blue-500' : 'text-red-400'}`}
                      >
                        {entry.winRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-blue-500 hover:underline">
              ← Trang chủ
            </Link>
          </div>
        </div>
      </div>
  )
}

export default LeaderboardPage
