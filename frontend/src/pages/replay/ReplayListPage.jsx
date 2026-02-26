import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { replayAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { Loader } from '@components/common'

function ResultBadge({ result }) {
  const cfg = {
    WhiteWin: { label: '⬜ Trắng thắng', cls: 'bg-blue-900 text-blue-300' },
    BlackWin: { label: '⬛ Đen thắng', cls: 'bg-gray-700 text-gray-300' },
    Draw: { label: '🤝 Hòa', cls: 'bg-yellow-900 text-yellow-300' },
  }
  const { label, cls } = cfg[result] ?? {
    label: result,
    cls: 'bg-gray-700 text-gray-300',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
}

function ModeBadge({ mode }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-purple-900 text-purple-300 font-medium">
      {mode === 'HumanVsBot' ? '🤖 vs Bot' : mode === 'HumanVsHuman' ? '👤 vs Human' : mode}
    </span>
  )
}

export default function ReplayListPage() {
  const navigate = useNavigate()
  const { error: showError } = useNotification()

  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('') // GameMode enum
  const [resultFilter, setResultFilter] = useState('') // GameResult enum

  useEffect(() => {
    setIsLoading(true)
    const filters = {}
    if (modeFilter) filters.mode = modeFilter
    if (resultFilter) filters.result = resultFilter
    replayAPI
      .getGameHistory(filters)
      .then((data) => setGames(data.games))
      .catch(() => showError('Không thể tải lịch sử'))
      .finally(() => setIsLoading(false))
  }, [modeFilter, resultFilter])

  // A2_ReplayFlow.puml: "User selects a saved game" → navigate
  const handleSelect = (gameId) => navigate(`/replays/${gameId}`)

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">📋 Lịch Sử Ván Đấu</h1>
          <p className="text-gray-400 text-sm">Chỉ hiển thị game đã lưu (state = Saved)</p>
        </div>

        {/* Filters — GameMode + GameResult enums */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tất cả chế độ</option>
            <option value="HumanVsBot">vs Bot</option>
            <option value="HumanVsHuman">vs Human</option>
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tất cả kết quả</option>
            <option value="WhiteWin">Trắng thắng</option>
            <option value="BlackWin">Đen thắng</option>
            <option value="Draw">Hòa</option>
          </select>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader size="lg" text="Đang tải..." />
          </div>
        )}

        {!isLoading && games.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl">♟</span>
            <p className="text-gray-400 mt-4">Chưa có ván đấu nào</p>
            <button
              onClick={() => navigate('/bot')}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
            >
              Chơi Ván Đầu Tiên
            </button>
          </div>
        )}

        {!isLoading && games.length > 0 && (
          <div className="space-y-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelect(game.id)}
                className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-gray-300 font-medium">
                      {game.whitePlayer.username} <span className="text-gray-500">vs</span>{' '}
                      {game.blackPlayer.username}
                    </span>
                    <ModeBadge mode={game.mode} />
                    <ResultBadge result={game.result} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{game.metadata?.totalMoves ?? '?'} nước</span>
                    {game.metadata?.opening && (
                      <span className="hidden md:inline truncate max-w-[160px]">
                        {game.metadata.opening}
                      </span>
                    )}
                    <span>{new Date(game.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="text-blue-400 group-hover:text-blue-300">▶ Replay</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
