import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

const PodiumCard = ({ entry, size }) => {
  if (!entry) return null

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
        {entry.username?.[0]?.toUpperCase() || '?'}
      </div>
      <p
        className="max-w-full text-sm font-bold text-gray-900 truncate"
        title={entry.displayName || entry.username || 'Unknown'}
      >
        {entry.displayName || entry.username || 'Unknown'}
      </p>
      <p className="text-lg font-extrabold mt-0.5">{entry.rating}</p>
    </div>
  )
}

const LeaderboardPage = () => {
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const fetchLeaderboard = async () => {
        setIsLoading(true)
        try {
          const params = { page: 1, pageSize: 50 }
          const normalizedSearch = search.trim()
          if (normalizedSearch) params.search = normalizedSearch
          const response = await api.get('/users/leaderboard', {
            params,
            signal: controller.signal,
          })
          const payload = response?.data ?? response
          setEntries(payload?.items || [])
        } catch (error) {
          if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
          setEntries([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchLeaderboard()
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  const top3 = entries.slice(0, 3)

  return (
    <div className="pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">🏆 Bảng xếp hạng</h1>
          <p className="text-sm text-gray-500 mt-1">Top kỳ thủ WebChess</p>
        </div>

        {top3.length === 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto">
            <PodiumCard entry={top3[1]} />
            <PodiumCard entry={top3[0]} size="lg" />
            <PodiumCard entry={top3[2]} />
          </div>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Tìm người chơi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 text-left w-12">#</th>
                <th className="py-3 px-4 text-left">Người chơi</th>
                <th className="py-3 px-4 text-right w-24">Rating</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell w-24">Peak</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                entries.map((entry) => (
                  <tr
                    key={entry.userId || entry.rank}
                    className="border-t border-gray-50 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4 text-gray-400 font-mono">{entry.rank}</td>
                    <td className="py-3 px-4 min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {entry.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span
                          className="block min-w-0 truncate text-gray-900"
                          title={entry.displayName || entry.username || 'Unknown'}
                        >
                          {entry.displayName || entry.username || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                      {entry.rating ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">
                      {entry.peakRating ?? 0}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!isLoading && entries.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              {search.trim()
                ? 'Không tìm thấy người chơi phù hợp.'
                : 'Chưa có dữ liệu xếp hạng.'}
            </div>
          )}
          {isLoading && (
            <div className="p-6 text-center text-sm text-gray-500">Đang tải dữ liệu...</div>
          )}
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
