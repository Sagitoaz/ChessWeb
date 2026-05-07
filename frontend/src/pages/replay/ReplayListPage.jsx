/**
 * ReplayListPage - Trang danh sách replay
 * Member 4 - Bot & Replay Module
 * Theme: Light mode (thống nhất)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { replayAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { useAuthStore } from '@store'
import { THEME } from '@/styles/theme'
import { Loader, Button, Pagination } from '@components/common'
import { PlayCircle } from 'lucide-react'
import { getUserDisplayName } from '@/utils/userDisplay'
import { getGamePlayerId, getGameTotalMoves, getViewerColor } from '@/utils/gameShape'

const PAGE_SIZE = 12

function ResultBadge({ result }) {
  const cfg = {
    win: {
      label: '✅ Thắng',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    lose: { label: '❌ Thua', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    draw: { label: '🤝 Hòa', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  }
  const { label, bg, text, border } = cfg[result] ?? {
    label: 'Đang cập nhật',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}>
      {label}
    </span>
  )
}

function ModeBadge({ mode }) {
  const modeLabel =
    mode === 'bot' || mode === 'HumanVsBot'
      ? 'Đấu Bot'
      : mode === 'ranked'
        ? 'Đấu hạng'
        : mode === 'tournament'
          ? 'Giải đấu'
          : mode === 'room' || mode === 'HumanVsHuman'
            ? 'Giao hữu'
            : 'Khác'

  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700">{modeLabel}</span>
}

export default function ReplayListPage() {
  const navigate = useNavigate()
  const { error: showError } = useNotification()
  const authUser = useAuthStore((state) => state.user)

  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalGames, setTotalGames] = useState(0)

  useEffect(() => {
    setCurrentPage(1)
  }, [modeFilter, resultFilter])

  useEffect(() => {
    setIsLoading(true)
    const filters = { page: currentPage, pageSize: PAGE_SIZE }
    if (modeFilter) filters.mode = modeFilter
    if (resultFilter) filters.result = resultFilter

    const normalizeGames = (payload) => {
      const normalizePerspectiveResult = (rawResult, playerSide) => {
        const v = typeof rawResult === 'string' ? rawResult.toLowerCase() : ''
        if (v === 'win' || v === 'lose' || v === 'draw') return v
        if (v === 'whitewin' || v === 'white_win' || v === '1-0') {
          return playerSide === 'white' ? 'win' : playerSide === 'black' ? 'lose' : null
        }
        if (v === 'blackwin' || v === 'black_win' || v === '0-1') {
          return playerSide === 'black' ? 'win' : playerSide === 'white' ? 'lose' : null
        }
        return null
      }

      const itemById = new Map(
        Array.isArray(payload?.items)
          ? payload.items.map((item) => [String(item.gameId || item.id), item])
          : []
      )

      if (Array.isArray(payload?.games)) {
        const items = payload.games.map((game) => {
          const gameId = String(game.id || game.gameId)
          const item = itemById.get(gameId)

          let playerSide = item?.playerSide || null
          const authUserId =
            authUser?.id || authUser?.userId || authUser?._id || authUser?.sub || null
          if (!playerSide && authUserId) {
            playerSide = getViewerColor(item, authUserId)
          }
          const authDisplayName = getUserDisplayName(authUser, '')
          if (!playerSide && authDisplayName) {
            if (getUserDisplayName(game?.whitePlayer, '') === authDisplayName) playerSide = 'white'
            if (getUserDisplayName(game?.blackPlayer, '') === authDisplayName) playerSide = 'black'
          }

          const result =
            normalizePerspectiveResult(item?.rawResult, playerSide) ||
            normalizePerspectiveResult(item?.result, playerSide) ||
            normalizePerspectiveResult(game?.rawResult, playerSide) ||
            normalizePerspectiveResult(game?.result, playerSide) ||
            null

          const whiteName = getUserDisplayName(game?.whitePlayer, 'White')
          const blackName = getUserDisplayName(game?.blackPlayer, 'Black')
          const opponent =
            playerSide === 'white' ? blackName : playerSide === 'black' ? whiteName : blackName

          return {
            ...game,
            id: gameId,
            mode: item?.mode || game?.mode || 'room',
            result,
            opponent,
          }
        })
        return {
          items,
          total: Number(payload?.total || payload?.pagination?.total || items.length || 0),
          page: Number(payload?.page || payload?.pagination?.page || currentPage),
          pageSize: Number(payload?.pageSize || payload?.pagination?.pageSize || PAGE_SIZE),
        }
      }

      if (Array.isArray(payload?.items)) {
        const items = payload.items.map((item) => {
          const whitePlayerId = getGamePlayerId(item, 'white')
          const blackPlayerId = getGamePlayerId(item, 'black')
          const playerSide =
            item.playerSide ||
            getViewerColor(item, authUser?.id || authUser?.userId || authUser?._id || authUser?.sub)

          return {
            id: item.gameId || item.id,
            mode: item.mode || 'room',
            result:
              normalizePerspectiveResult(item.rawResult, playerSide) ||
              normalizePerspectiveResult(item.result, playerSide) ||
              null,
            createdAt: item.createdAt,
            opponent:
              playerSide === 'white'
                ? item.blackUsername || blackPlayerId || 'Đối thủ'
                : playerSide === 'black'
                  ? item.whiteUsername || whitePlayerId || 'Đối thủ'
                  : 'Đối thủ',
            whitePlayer: { username: item.whiteUsername || whitePlayerId || 'White' },
            blackPlayer: { username: item.blackUsername || blackPlayerId || 'Black' },
            metadata: { totalMoves: getGameTotalMoves(item) },
          }
        })
        return {
          items,
          total: Number(payload?.total || payload?.pagination?.total || items.length || 0),
          page: Number(payload?.page || payload?.pagination?.page || currentPage),
          pageSize: Number(payload?.pageSize || payload?.pagination?.pageSize || PAGE_SIZE),
        }
      }
      return { items: [], total: 0, page: currentPage, pageSize: PAGE_SIZE }
    }

    replayAPI
      .getGameHistory(filters)
      .then((data) => {
        const normalized = normalizeGames(data)
        setGames(Array.isArray(normalized?.items) ? normalized.items : [])
        const total = Number(normalized?.total || 0)
        const pageSize = Number(normalized?.pageSize || PAGE_SIZE)
        setTotalGames(total)
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)))
      })
      .catch(() => showError('Không thể tải lịch sử'))
      .finally(() => setIsLoading(false))
  }, [authUser, currentPage, modeFilter, resultFilter, showError])

  const handleSelect = (gameId) => navigate(`/replays/${gameId}`)

  return (
    <div className={`min-h-full ${THEME.background.page} py-4 px-2 sm:px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="ui-surface ui-card-padding mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] font-bold text-gray-400 mb-1">Replay</p>
              <h1 className={`text-2xl sm:text-3xl font-bold ${THEME.text.primary} mb-1`}>
                Lịch sử đấu & Replay
              </h1>
              <p className={`${THEME.text.secondary}`}>
                Xem lại ván đã chơi theo chế độ, kết quả và thời gian
              </p>
            </div>
            <span className="ui-chip">{totalGames} ván</span>
          </div>
        </div>

        {/* Filters */}
        <div
          className={`${THEME.background.card} ${THEME.rounded.lg} border ${THEME.border.DEFAULT} p-4 mb-4`}
        >
          <div className="flex flex-wrap gap-3">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className={`${THEME.background.card} ${THEME.text.primary} border ${THEME.border.DEFAULT} ${THEME.rounded.DEFAULT} px-4 py-2 text-sm`}
            >
              <option value="">Tất cả chế độ</option>
              <option value="bot">Đấu Bot</option>
              <option value="ranked">Đấu hạng</option>
              <option value="room">Giao hữu</option>
              <option value="tournament">Giải đấu</option>
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className={`${THEME.background.card} ${THEME.text.primary} border ${THEME.border.DEFAULT} ${THEME.rounded.DEFAULT} px-4 py-2 text-sm`}
            >
              <option value="">Tất cả kết quả</option>
              <option value="win">Thắng</option>
              <option value="lose">Thua</option>
              <option value="draw">Hòa</option>
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
          <>
            <div className="space-y-2.5">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelect(game.id)}
                  className={`w-full ${THEME.background.card} border ${THEME.border.DEFAULT} ${THEME.rounded.lg} p-4 text-left transition-all group hover:bg-gray-50 hover:border-gray-300 ${THEME.shadow.sm}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`${THEME.text.primary} font-semibold text-sm`}>
                        Đối thủ: {game.opponent || game.blackPlayer.username}
                      </span>
                      <ModeBadge mode={game.mode} />
                      <ResultBadge result={game.result} />
                    </div>
                    <div className={`flex items-center justify-between lg:justify-end gap-3 flex-wrap text-xs sm:text-sm ${THEME.text.secondary}`}>
                      <span className="font-medium">{game.metadata?.totalMoves ?? '?'} nước</span>
                      {game.metadata?.opening && (
                        <span className="hidden md:inline truncate max-w-[180px]">
                          {game.metadata.opening}
                        </span>
                      )}
                      <span>
                        {new Date(game.createdAt).toLocaleDateString('vi-VN')}{' '}
                        {new Date(game.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={`${THEME.primary.text} group-hover:underline flex items-center gap-1 font-semibold`}>
                        <PlayCircle className="w-4 h-4" />
                        Replay
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} className="mt-6" />
            <p className="text-center text-xs text-gray-500 mt-2">
              Trang {currentPage}/{totalPages} · {PAGE_SIZE} ván mỗi trang
            </p>
          </>
        )}
      </div>
    </div>
  )
}
