import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ArrowLeft, Flag, ShieldAlert, Swords, Wifi, WifiOff, Crown } from 'lucide-react'
import { Avatar, Button, Card, Loader } from '@/components/common'
import { ChessBoard } from '@/components/game'
import { useNotification } from '@/components/common/Notification'
import { useAuthStore } from '@/store'
import gameService from '@/services/gameService'
import { useGameSocket } from '@/hooks/useWebSocket'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const normalizeTurnLabel = (turn) => (turn === 'w' ? 'Trắng' : 'Đen')

const normalizeResultLabel = (raw) => {
  const value = String(raw || 'draw').toLowerCase()
  if (value === 'whitewin' || value === '1-0' || value === 'white_win') {
    return 'Trắng thắng'
  }
  if (value === 'blackwin' || value === '0-1' || value === 'black_win') {
    return 'Đen thắng'
  }
  return 'Hòa'
}

const findMatchByGameId = (rounds, targetGameId) => {
  if (!Array.isArray(rounds) || !targetGameId) return null
  for (const round of rounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : []
    const found = matches.find((match) => String(match?.gameId || '') === String(targetGameId))
    if (found) return found
  }
  return null
}

export default function TournamentMatchPlayPage() {
  const navigate = useNavigate()
  const { tournamentId, gameId } = useParams()
  const authUser = useAuthStore((state) => state.user)
  const { showNotification } = useNotification()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resultText, setResultText] = useState('')
  const [playerColor, setPlayerColor] = useState('white')
  const [whiteName, setWhiteName] = useState('Người chơi Trắng')
  const [blackName, setBlackName] = useState('Người chơi Đen')
  const [whitePlayerId, setWhitePlayerId] = useState('')
  const [blackPlayerId, setBlackPlayerId] = useState('')
  const [moveHistory, setMoveHistory] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [matchIdInBracket, setMatchIdInBracket] = useState('')
  const [participantStatus, setParticipantStatus] = useState(null)
  const [submittingResign, setSubmittingResign] = useState(false)

  const chessRef = useRef(new Chess(INITIAL_FEN))

  const currentUserId = authUser?.id || authUser?.userId || authUser?._id || authUser?.sub || null

  const {
    isConnected: isSocketConnected,
    joinGame,
    sendMove,
    resign,
    onMoveUpdate,
    onGameEnd,
    off,
  } = useGameSocket(gameId)

  const myTurn = chessRef.current.turn() === (playerColor === 'white' ? 'w' : 'b')
  const isFinished = Boolean(resultText)

  const loadGame = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    setError('')

    try {
      const payload = await gameService.getGameById(gameId)
      const game = payload?.data ?? payload

      const whitePlayerId = String(game?.whitePlayerId || '')
      const blackPlayerId = String(game?.blackPlayerId || '')

      if (
        currentUserId &&
        whitePlayerId !== String(currentUserId) &&
        blackPlayerId !== String(currentUserId)
      ) {
        showNotification({
          type: 'error',
          title: 'Không thể vào trận',
          message: 'Bạn không phải người chơi của trận đấu này.',
        })
        return
      }

      setWhitePlayerId(whitePlayerId)
      setBlackPlayerId(blackPlayerId)
      setPlayerColor(whitePlayerId === String(currentUserId) ? 'white' : 'black')
      setWhiteName(game?.whitePlayer?.username || game?.whiteUsername || 'Người chơi Trắng')
      setBlackName(game?.blackPlayer?.username || game?.blackUsername || 'Người chơi Đen')

      chessRef.current = new Chess(String(game?.initialFEN || INITIAL_FEN))
      const moves = Array.isArray(game?.moves) ? game.moves : []
      for (const move of moves) {
        chessRef.current.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        })
      }

      setMoveHistory(chessRef.current.history({ verbose: true }))
      const latestMove = chessRef.current.history({ verbose: true }).slice(-1)[0]
      if (latestMove?.from && latestMove?.to) {
        setLastMove({ from: latestMove.from, to: latestMove.to })
      }

      if (game?.finishedAt || game?.state === 'Saved') {
        setResultText(normalizeResultLabel(game?.rawResult || game?.result))
      }

      if (tournamentId) {
        const tournamentPayload = await gameService.getTournament(tournamentId)
        const tournament = tournamentPayload?.data ?? tournamentPayload
        const match = findMatchByGameId(tournament?.rounds, gameId)
        setMatchIdInBracket(String(match?.id || ''))

        const participants = Array.isArray(tournament?.participants) ? tournament.participants : []
        const me = participants.find(
          (participant) => String(participant?.userId || '') === String(currentUserId || '')
        )
        const status = me?.status || null
        setParticipantStatus(status)
        if (status === 'eliminated') {
          showNotification({
            type: 'error',
            title: 'Loại khỏi giải',
            message: 'Bạn đã bị loại khỏi giải đấu.',
          })
        }
      }
    } catch (loadError) {
      showNotification({
        type: 'error',
        title: 'Lỗi tải trận',
        message: loadError?.message || 'Không thể tải trận đấu tournament.',
      })
    } finally {
      setLoading(false)
    }
  }, [currentUserId, gameId, tournamentId, showNotification])

  useEffect(() => {
    void loadGame()
  }, [loadGame])

  useEffect(() => {
    if (!isSocketConnected || !gameId) return
    joinGame()
  }, [gameId, isSocketConnected, joinGame])

  useEffect(() => {
    const handleMoveUpdate = (payload) => {
      const move = payload?.move
      if (!move?.from || !move?.to) return

      const applied = chessRef.current.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })
      if (!applied) return

      setMoveHistory(chessRef.current.history({ verbose: true }))
      setLastMove({ from: applied.from, to: applied.to })
    }

    const handleGameEnd = (payload) => {
      setResultText(normalizeResultLabel(payload?.result))
      const reason = String(payload?.reason || '').toLowerCase()
      const resignedByUserId = String(payload?.resignedByUserId || '')
      if (reason === 'resignation') {
        if (resignedByUserId && resignedByUserId === String(currentUserId || '')) {
          showNotification({
            type: 'info',
            title: 'Đầu hàng',
            message: 'Bạn đã đầu hàng. Kết quả đã được cập nhật.',
          })
        } else {
          showNotification({
            type: 'info',
            title: 'Đối thủ đầu hàng',
            message: 'Đối thủ đã đầu hàng. Kết quả đã được cập nhật.',
          })
        }
      } else {
        showNotification({
          type: 'info',
          title: 'Trận đấu kết thúc',
          message: 'Trận đấu đã kết thúc, bảng điểm đang được cập nhật.',
        })
      }
      void loadGame()
    }

    onMoveUpdate(handleMoveUpdate)
    onGameEnd(handleGameEnd)

    return () => {
      off('game:moveUpdate', handleMoveUpdate)
      off('game:end', handleGameEnd)
    }
  }, [currentUserId, loadGame, off, onGameEnd, onMoveUpdate, showNotification])

  const handleMove = useCallback(
    (move) => {
      // ChessBoard has already applied this move to chessRef.current.
      setMoveHistory(chessRef.current.history({ verbose: true }))
      setLastMove({ from: move.from, to: move.to })
      sendMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        san: move.san,
      })
    },
    [sendMove]
  )

  const boardDisabled = Boolean(resultText) || !myTurn

  const turnLabel = normalizeTurnLabel(chessRef.current.turn())
  const myDisplayName = authUser?.displayName || authUser?.username || 'Bạn'
  const mySideLabel = playerColor === 'white' ? 'Trắng' : 'Đen'
  const myOpponentName = playerColor === 'white' ? blackName : whiteName
  const canResign = !isFinished && !submittingResign
  const handleResign = useCallback(async () => {
    if (!tournamentId || !gameId || isFinished || submittingResign) return

    setSubmittingResign(true)

    try {
      const targetMatchId = matchIdInBracket || gameId
      const response = await gameService.resignTournamentMatch(tournamentId, targetMatchId)
      const payload = response?.data ?? response

      setResultText(normalizeResultLabel(payload?.result))
      showNotification({
        type: 'success',
        title: 'Đầu hàng thành công',
        message: 'Bạn đã đầu hàng. Kết quả trận và bảng điểm đã được cập nhật.',
      })
      setParticipantStatus('eliminated')

      if (isSocketConnected) {
        resign()
      }

      void loadGame()
    } catch (submitError) {
      const message =
        submitError?.response?.data?.message ||
        submitError?.message ||
        'Không thể cập nhật kết quả đầu hàng. Vui lòng thử lại.'
      showNotification({
        type: 'error',
        title: 'Lỗi đầu hàng',
        message: String(message),
      })
    } finally {
      setSubmittingResign(false)
    }
  }, [
    gameId,
    isFinished,
    isSocketConnected,
    loadGame,
    matchIdInBracket,
    resign,
    showNotification,
    submittingResign,
    tournamentId,
  ])

  const hasValidPlayers = Boolean(whitePlayerId && blackPlayerId)

  const movePairs = useMemo(() => {
    const pairs = []
    for (let index = 0; index < moveHistory.length; index += 2) {
      const fullMove = Math.floor(index / 2) + 1
      const whiteMove = moveHistory[index]?.san || ''
      const blackMove = moveHistory[index + 1]?.san || ''
      pairs.push({ fullMove, whiteMove, blackMove })
    }
    return pairs
  }, [moveHistory])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader size="lg" text="Đang tải trận đấu..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="p-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3 text-red-700">
            <ShieldAlert className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">Không thể vào trận</p>
              <p className="text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigate(`/tournaments/${tournamentId}`)}
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại giải đấu
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white px-5 py-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              size="sm"
              className="bg-white/15 hover:bg-white/25 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Về giải đấu
            </Button>
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-100">Tournament Battle</p>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Phòng đấu trực tiếp
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/20 px-3 py-1 font-mono">Game: {gameId}</span>
            <span
              className={`rounded-full px-3 py-1 font-semibold ${isSocketConnected ? 'bg-emerald-500/85' : 'bg-red-500/85'}`}
            >
              {isSocketConnected ? (
                <span className="inline-flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> Realtime On
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" /> Mất kết nối
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {resultText && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Kết thúc trận: {resultText}
        </div>
      )}

      {/* Notifications are now global toasts */}

      {participantStatus === 'eliminated' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Bạn đã bị loại khỏi giải đấu.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <Card className="p-3 bg-white border border-blue-100 shadow-lg">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="text-sm text-blue-900 font-semibold">
              Lượt hiện tại: <span className="font-extrabold">{turnLabel}</span>
            </div>
            <div className="text-xs text-blue-700">
              Bạn cầm quân <span className="font-bold">{mySideLabel}</span>
            </div>
          </div>
          <ChessBoard
            gameState={chessRef.current}
            onMove={handleMove}
            playerColor={playerColor}
            disabled={boardDisabled}
            highlightCheck
            soundEnabled={false}
            lastMove={lastMove}
          />
        </Card>

        <Card className="p-4 bg-white border border-blue-100 shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Bảng điều khiển trận đấu</h2>

          <div className="space-y-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={whiteName} size="sm" fallbackColor="gray" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Trắng</p>
                  <p className="font-semibold text-gray-900 leading-tight">{whiteName}</p>
                </div>
              </div>
              {playerColor === 'white' && <Crown className="w-4 h-4 text-amber-500" />}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={blackName} size="sm" fallbackColor="gray" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Đen</p>
                  <p className="font-semibold text-gray-900 leading-tight">{blackName}</p>
                </div>
              </div>
              {playerColor === 'black' && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <p>
              Bạn: <span className="font-semibold">{myDisplayName}</span> ({mySideLabel})
            </p>
            <p>
              Đối thủ: <span className="font-semibold">{myOpponentName}</span>
            </p>
          </div>

          <div className="mt-1 flex gap-2">
            <Button variant="outline" disabled={!canResign} onClick={handleResign}>
              <Flag className="w-4 h-4" />
              {submittingResign ? 'Đang xử lý...' : 'Đầu hàng'}
            </Button>
            <Button
              variant="outline"
              disabled={!isFinished}
              onClick={() => navigate(`/replays/${gameId}`)}
            >
              Xem replay
            </Button>
          </div>

          {!hasValidPlayers && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Trận chưa đủ thông tin người chơi. Hãy quay lại trang giải đấu và làm mới dữ liệu.
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Lịch sử nước đi</h3>
            <div className="rounded-lg border border-gray-200 p-3 max-h-80 overflow-y-auto bg-white">
              {movePairs.length === 0 ? (
                <p className="text-xs text-gray-500">Chưa có nước đi nào.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-[48px_1fr_1fr] gap-2 px-2 py-1 text-gray-500 font-semibold border-b border-gray-100">
                    <span>#</span>
                    <span>Trắng</span>
                    <span>Đen</span>
                  </div>
                  {movePairs.map((pair) => (
                    <div
                      key={`move-pair-${pair.fullMove}`}
                      className="grid grid-cols-[48px_1fr_1fr] gap-2 px-2 py-1 rounded hover:bg-gray-50"
                    >
                      <span className="text-gray-500">{pair.fullMove}</span>
                      <span className="font-medium text-gray-900">{pair.whiteMove || '-'}</span>
                      <span className="font-medium text-gray-900">{pair.blackMove || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
