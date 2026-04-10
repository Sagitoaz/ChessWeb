/**
 * ReplayListPage - Trang danh sách replay
 * Member 4 - Bot & Replay Module
 * Theme: Light mode (thống nhất)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { replayAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { THEME, STATUS_COLORS } from '@/styles/theme'
import { Loader, Button } from '@components/common'
import { PlayCircle } from 'lucide-react'

function ResultBadge({ result }) {
  const cfg = {
    WhiteWin: {
      label: '⬜ Trắng thắng',
      bg: STATUS_COLORS.playing.bg,
      text: STATUS_COLORS.playing.text,
    },
    BlackWin: { label: '⬛ Đen thắng', bg: STATUS_COLORS.draw.bg, text: STATUS_COLORS.draw.text },
    Draw: { label: '🤝 Hòa', bg: STATUS_COLORS.waiting.bg, text: STATUS_COLORS.waiting.text },
  }
  const { label, bg, text } = cfg[result] ?? {
    label: result,
    bg: STATUS_COLORS.draw.bg,
    text: STATUS_COLORS.draw.text,
  }
  return (
    <span className={`px-3 py-1 ${THEME.rounded.DEFAULT} text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

function ModeBadge({ mode }) {
  return (
    <span
      className={`px-3 py-1 ${THEME.rounded.DEFAULT} text-xs font-medium ${STATUS_COLORS.playing.bg} ${STATUS_COLORS.playing.text}`}
    >
      {mode === 'HumanVsBot' ? '🤖 vs Bot' : mode === 'HumanVsHuman' ? '👤 vs Human' : mode}
    </span>
  )
}

export default function ReplayListPage() {
  const navigate = useNavigate()
  const { error: showError } = useNotification()

  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')

  useEffect(() => {
    setIsLoading(true)
    const filters = {}
    if (modeFilter) filters.mode = modeFilter
    if (resultFilter) filters.result = resultFilter

    const normalizeGames = (payload) => {
      if (Array.isArray(payload?.games)) return payload.games
      if (Array.isArray(payload?.items)) {
        return payload.items.map((item) => ({
          id: item.gameId || item.id,
          mode: item.mode === 'bot' ? 'HumanVsBot' : 'HumanVsHuman',
          result: item.result,
          createdAt: item.createdAt,
          whitePlayer: { username: item.whitePlayerId || 'White' },
          blackPlayer: { username: item.blackPlayerId || 'Black' },
          metadata: { totalMoves: null },
        }))
      }
      return []
    }

    replayAPI
      .getGameHistory(filters)
      .then((data) => setGames(normalizeGames(data)))
      .catch(() => showError('Không thể tải lịch sử'))
      .finally(() => setIsLoading(false))
  }, [modeFilter, resultFilter, showError])

  const handleSelect = (gameId) => navigate(`/replays/${gameId}`)

  return (
    <div className={`min-h-screen ${THEME.background.page} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="text-6xl mb-4 text-center">📹</div>
          <h1 className={`text-3xl font-bold ${THEME.text.primary} mb-2 text-center`}>
            Lịch Sử Ván Đấu
          </h1>
          <p className={`${THEME.text.secondary} text-center`}>Xem lại các ván đấu đã chơi</p>
        </div>

        {/* Filters */}
        <div
          className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-4 mb-6`}
        >
          <div className="flex flex-wrap gap-3">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className={`${THEME.background.card} ${THEME.text.primary} border ${THEME.border.DEFAULT} ${THEME.rounded.DEFAULT} px-4 py-2 text-sm`}
            >
              <option value="">Tất cả chế độ</option>
              <option value="HumanVsBot">vs Bot</option>
              <option value="HumanVsHuman">vs Human</option>
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className={`${THEME.background.card} ${THEME.text.primary} border ${THEME.border.DEFAULT} ${THEME.rounded.DEFAULT} px-4 py-2 text-sm`}
            >
              <option value="">Tất cả kết quả</option>
              <option value="WhiteWin">Trắng thắng</option>
              <option value="BlackWin">Đen thắng</option>
              <option value="Draw">Hòa</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader size="lg" text="Đang tải..." />
          </div>
        )}

        {!isLoading && games.length === 0 && (
          <div
            className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} text-center py-16`}
          >
            <span className="text-6xl">♟</span>
            <p className={`${THEME.text.secondary} mt-4`}>Chưa có ván đấu nào</p>
            <Button
              onClick={() => navigate('/bot')}
              className={`mt-6 ${THEME.primary.DEFAULT} ${THEME.primary.hover}`}
            >
              Chơi Ván Đầu Tiên
            </Button>
          </div>
        )}

        {!isLoading && games.length > 0 && (
          <div className="space-y-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelect(game.id)}
                className={`w-full ${THEME.background.card} ${THEME.background.hover} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-5 text-left transition-all group ${THEME.shadow.sm}`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`${THEME.text.primary} font-semibold`}>
                      {game.whitePlayer.username} <span className={THEME.text.muted}>vs</span>{' '}
                      {game.blackPlayer.username}
                    </span>
                    <ModeBadge mode={game.mode} />
                    <ResultBadge result={game.result} />
                  </div>
                  <div className={`flex items-center gap-4 text-sm ${THEME.text.secondary}`}>
                    <span>{game.metadata?.totalMoves ?? '?'} nước</span>
                    {game.metadata?.opening && (
                      <span className="hidden md:inline truncate max-w-[160px]">
                        {game.metadata.opening}
                      </span>
                    )}
                    <span>{new Date(game.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span
                      className={`${THEME.primary.text} group-hover:underline flex items-center gap-1`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      Replay
                    </span>
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
