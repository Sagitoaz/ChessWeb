import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import { Chess } from 'chess.js'
import { ChessBoard } from '@components/game'
import { Avatar, Button, Card } from '@/components/common'
import gameService from '@/services/gameService'
import { useGameSocket } from '@hooks/useWebSocket'
import { useAuthStore } from '@store'
import { ArrowLeft, Clock, Flag, Play, Trophy, Users } from 'lucide-react'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remaining = safeSeconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid
    if (typeof value.id === 'string') return value.id
    if (typeof value._id === 'string') return value._id
  }
  return String(value)
}

const normalizeRoom = (room, roomId) => {
  const members = Array.isArray(room?.members)
    ? room.members.map((member) => ({
        ...member,
        userId: normalizeId(member?.userId),
        role: String(member?.role || '').toLowerCase(),
      }))
    : []
  const ownerMember = members.find((member) => member?.role === 'owner') || null
  const ownerUserId = normalizeId(room?.ownerUserId || room?.host?.id || ownerMember?.userId)
  const whitePlayerId = normalizeId(room?.whitePlayerId)
  const blackPlayerId = normalizeId(room?.blackPlayerId)

  return {
    code: room?.code || roomId,
    name: room?.name || `Phòng ${roomId}`,
    ownerUserId: ownerUserId || null,
    status: room?.status || 'waiting',
    activeGameId: room?.activeGameId || null,
    whitePlayerId: whitePlayerId || null,
    blackPlayerId: blackPlayerId || null,
    initialTimeSeconds: Number(room?.initialTimeSeconds || 600),
    isPrivate: room?.isPrivate ?? true,
    members,
  }
}

const toLocalResultFromAbsolute = (absoluteResult, playerColor) => {
  const normalized = typeof absoluteResult === 'string' ? absoluteResult.toLowerCase() : ''
  if (normalized === 'draw' || normalized === '1/2-1/2') return 'draw'
  if (normalized === 'whitewin' || normalized === '1-0' || normalized === 'white_win') {
    return playerColor === 'white' ? 'win' : 'lose'
  }
  if (normalized === 'blackwin' || normalized === '0-1' || normalized === 'black_win') {
    return playerColor === 'black' ? 'win' : 'lose'
  }
  return 'draw'
}

export default function RoomPlayPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const { showNotification } = useNotification()

  const [room, setRoom] = useState(() => normalizeRoom(location.state?.room || null, roomId))
  const [loading, setLoading] = useState(true)
  const [gamePhase, setGamePhase] = useState('waiting')
  const [showStartBusy, setShowStartBusy] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [whiteTime, setWhiteTime] = useState(600)
  const [blackTime, setBlackTime] = useState(600)

  const chessRef = useRef(new Chess(INITIAL_FEN))
  const clockRef = useRef(null)
  const lastTickRef = useRef(null)
  const endedRef = useRef(false)
  const joinedGameRef = useRef(null)
  const loadedGameRef = useRef(null)

  const activeGameId = room.activeGameId || location.state?.activeGameId || null
  const isOwner = Boolean(user?.id && room.ownerUserId && user.id === room.ownerUserId)
  const playerColor = useMemo(() => {
    const normalizedUserId = normalizeId(user?.id)
    const memberOwner = room.members.find((member) => member?.role === 'owner')
    const ownerUserId = normalizeId(room.ownerUserId || memberOwner?.userId)
    const whiteId = normalizeId(room.whitePlayerId)
    const blackId = normalizeId(room.blackPlayerId)

    if (!normalizedUserId) return 'white'
    if (whiteId && normalizedUserId === whiteId) return 'white'
    if (blackId && normalizedUserId === blackId) return 'black'

    if (ownerUserId && normalizedUserId === ownerUserId) return 'white'

    const meMember = room.members.find((member) => member?.userId === normalizedUserId)
    if (meMember?.role === 'owner') return 'white'
    if (meMember) return 'black'

    const otherMember = room.members.find(
      (member) => member?.userId && member.userId !== ownerUserId
    )
    if (otherMember?.userId && normalizedUserId === otherMember.userId) return 'black'

    return 'white'
  }, [room.blackPlayerId, room.members, room.ownerUserId, room.whitePlayerId, user?.id])
  const myColorCode = playerColor === 'white' ? 'w' : 'b'

  const {
    isConnected: isSocketConnected,
    joinGame,
    sendMove,
    resign,
    onMoveUpdate,
    onGameEnd,
    off,
  } = useGameSocket(activeGameId)

  const refreshRoom = useCallback(async () => {
    if (!roomId) return
    try {
      const response = await gameService.getRoom(roomId)
      const data = response?.data ?? response
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[room:play] refresh room', {
          roomId,
          status: data?.status,
          activeGameId: data?.activeGameId,
        })
      }
      setRoom(normalizeRoom(data, roomId))
    } catch (fetchError) {
      showNotification({
        type: 'error',
        title: 'Lỗi tải phòng',
        message: fetchError.message || 'Không thể tải phòng',
      })
    } finally {
      setLoading(false)
    }
  }, [roomId, showNotification])

  useEffect(() => {
    void refreshRoom()
    const interval = setInterval(() => {
      void refreshRoom()
    }, 2000)

    return () => clearInterval(interval)
  }, [refreshRoom])

  useEffect(() => {
    if (!activeGameId || !isSocketConnected) return
    if (joinedGameRef.current === activeGameId) return
    joinGame()
    joinedGameRef.current = activeGameId
  }, [activeGameId, isSocketConnected, joinGame])

  const endGame = useCallback(
    (result, reason) => {
      if (endedRef.current) return
      endedRef.current = true
      setGameResult({ result, reason })
      setGamePhase('ended')
      if (clockRef.current) clearInterval(clockRef.current)
      showNotification({
        type: result === 'draw' ? 'info' : result === 'win' ? 'success' : 'error',
        title: result === 'draw' ? 'Ván đấu hòa' : result === 'win' ? 'Bạn thắng' : 'Bạn thua',
        message:
          reason === 'timeout'
            ? 'Trận đấu đã kết thúc do hết giờ.'
            : reason === 'resignation'
              ? 'Trận đấu đã kết thúc do đầu hàng.'
              : 'Trận đấu đã kết thúc.',
      })
    },
    [showNotification]
  )

  useEffect(() => {
    if (!activeGameId || gamePhase !== 'playing') return

    let mounted = true
    const syncEndedState = async () => {
      try {
        const game = await gameService.getGameById(activeGameId)
        if (!mounted || endedRef.current) return

        const state = String(game?.state || '').toLowerCase()
        if (state !== 'saved' && state !== 'finished') return

        if (Array.isArray(game?.moves) && game.moves.length > 0) {
          setMoveHistory(game.moves)
          const last = game.moves[game.moves.length - 1]
          if (last?.from && last?.to) {
            // last move highlight is not used in this page yet
          }
        }

        const absoluteResult = game?.rawResult || game?.result || 'Draw'
        const localResult = toLocalResultFromAbsolute(absoluteResult, playerColor)
        endGame(localResult, game?.endReason || 'resignation')
      } catch {
        // Ignore transient read errors while game is still running.
      }
    }

    const interval = setInterval(() => {
      void syncEndedState()
    }, 2000)
    void syncEndedState()

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [activeGameId, endGame, gamePhase, playerColor])

  useEffect(() => {
    if (room.status !== 'playing') {
      setGamePhase('waiting')
      return
    }

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[room:play] room entered playing state', {
        roomId,
        activeGameId: room.activeGameId,
      })
    }

    setGamePhase('playing')
    setWhiteTime(room.initialTimeSeconds || 600)
    setBlackTime(room.initialTimeSeconds || 600)

    if (room.activeGameId && loadedGameRef.current !== room.activeGameId) {
      chessRef.current = new Chess(INITIAL_FEN)
      setMoveHistory([])
      endedRef.current = false
      setGameResult(null)
      loadedGameRef.current = room.activeGameId
    }
  }, [room.activeGameId, room.initialTimeSeconds, room.status, roomId])

  useEffect(() => {
    if (gamePhase !== 'playing') return

    lastTickRef.current = performance.now()
    clockRef.current = setInterval(() => {
      if (endedRef.current) return
      const now = performance.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      if (chessRef.current.turn() === 'w') {
        setWhiteTime((prev) => Math.max(0, prev - delta / 1000))
      } else {
        setBlackTime((prev) => Math.max(0, prev - delta / 1000))
      }
    }, 1000)

    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [gamePhase])

  const checkGameEnd = useCallback(() => {
    if (chessRef.current.isCheckmate()) {
      const loserColor = chessRef.current.turn() === 'w' ? 'white' : 'black'
      endGame(loserColor === playerColor ? 'lose' : 'win', 'checkmate')
      return true
    }

    if (chessRef.current.isStalemate() || chessRef.current.isDraw()) {
      endGame('draw', 'draw')
      return true
    }

    return false
  }, [endGame, playerColor])

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
      checkGameEnd()
    }

    const handleGameEnd = (payload) => {
      const rawResult = typeof payload?.result === 'string' ? payload.result.toLowerCase() : ''
      const localResult =
        rawResult === 'whitewin' || rawResult === 'white_win' || rawResult === '1-0'
          ? playerColor === 'white'
            ? 'win'
            : 'lose'
          : rawResult === 'blackwin' || rawResult === 'black_win' || rawResult === '0-1'
            ? playerColor === 'black'
              ? 'win'
              : 'lose'
            : 'draw'
      endGame(localResult, payload?.reason || 'game_end')
    }

    onMoveUpdate(handleMoveUpdate)
    onGameEnd(handleGameEnd)
    return () => {
      off('game:moveUpdate', handleMoveUpdate)
      off('game:end', handleGameEnd)
    }
  }, [checkGameEnd, endGame, off, onGameEnd, onMoveUpdate, playerColor])

  useEffect(() => {
    if (gamePhase !== 'playing' || endedRef.current) return
    if (whiteTime <= 0) {
      endGame(playerColor === 'white' ? 'lose' : 'win', 'timeout')
    } else if (blackTime <= 0) {
      endGame(playerColor === 'black' ? 'lose' : 'win', 'timeout')
    }
  }, [blackTime, endGame, gamePhase, playerColor, whiteTime])

  const handleMove = useCallback(
    (move) => {
      if (gamePhase !== 'playing' || !activeGameId) return

      setMoveHistory(chessRef.current.history({ verbose: true }))
      checkGameEnd()

      if (isSocketConnected) {
        sendMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
        })
      }
    },
    [activeGameId, checkGameEnd, gamePhase, isSocketConnected, sendMove]
  )

  const handleStartGame = async () => {
    if (!isOwner) return
    setShowStartBusy(true)
    try {
      const response = await gameService.startRoomGame(room.code)
      const data = response?.data ?? response
      setRoom((prev) => ({
        ...prev,
        status: 'playing',
        activeGameId: data?.gameId || prev.activeGameId,
        whitePlayerId: data?.whitePlayerId || prev.whitePlayerId,
        blackPlayerId: data?.blackPlayerId || prev.blackPlayerId,
      }))
      setGamePhase('playing')
    } catch (startError) {
      showNotification({
        type: 'error',
        title: 'Lỗi bắt đầu ván',
        message: startError.message || 'Không thể bắt đầu ván đấu',
      })
    } finally {
      setShowStartBusy(false)
    }
  }

  const handleResign = () => {
    if (gamePhase !== 'playing') return
    setShowResignConfirm(false)
    if (activeGameId && isSocketConnected) {
      resign()
      showNotification({
        type: 'info',
        title: 'Đang xử lý đầu hàng',
        message: 'Vui lòng chờ đồng bộ kết quả ván đấu.',
      })
      return
    }

    showNotification({
      type: 'error',
      title: 'Không thể đầu hàng lúc này',
      message: 'Mất kết nối realtime. Vui lòng thử lại khi kết nối ổn định.',
    })
  }

  const roomMembers = room.members || []
  const host = roomMembers.find((member) => member.role === 'owner') || roomMembers[0]
  const opponentMember = roomMembers.find((member) => member.userId !== user?.id) || null
  const isPlayerTurn =
    gamePhase === 'playing' && chessRef.current.turn() === myColorCode && !endedRef.current
  const boardDisabled = gamePhase !== 'playing' || !activeGameId || !isPlayerTurn
  const opponentName = opponentMember?.username || 'Đang chờ đối thủ'
  const playerName = user?.username || 'Bạn'

  if (loading && !room.code) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate('/rooms')} size="sm">
          <ArrowLeft className="w-4 h-4" />
          Rời phòng
        </Button>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-mono font-semibold text-blue-600">{room.code}</span>
          <span>·</span>
          <span>{room.status === 'playing' ? 'Đang chơi' : 'Đang chờ'}</span>
        </div>
      </div>

      {/* Notifications are shown via global toast */}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="space-y-4">
          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar src={opponentMember?.avatarUrl} name={opponentName} size="sm" />
                <div>
                  <p className="font-semibold text-gray-900">{opponentName}</p>
                  <p className="text-xs text-gray-500">Đối thủ</p>
                </div>
              </div>
              <div className="font-mono text-2xl font-bold px-3 py-1 rounded-lg bg-gray-100 text-gray-700">
                {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="p-2 sm:p-3">
              {room.status === 'playing' && activeGameId ? (
                <ChessBoard
                  gameState={chessRef.current}
                  onMove={handleMove}
                  playerColor={playerColor}
                  disabled={boardDisabled}
                  highlightCheck
                  soundEnabled={false}
                />
              ) : (
                <div className="aspect-square flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100">
                  <div className="text-center px-6">
                    <div className="text-6xl mb-4">♟️</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Phòng đã sẵn sàng</h2>
                    <p className="text-gray-600 mb-4">
                      {isOwner
                        ? 'Bấm bắt đầu để mở ván đấu và mời đối thủ chơi.'
                        : 'Đang chờ chủ phòng bắt đầu trận đấu.'}
                    </p>
                    {isOwner && (
                      <Button
                        onClick={handleStartGame}
                        loading={showStartBusy}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4" />
                        Bắt đầu ván
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar src={user?.avatarUrl} name={playerName} size="sm" />
                <div>
                  <p className="font-semibold text-gray-900">{playerName}</p>
                  <p className="text-xs text-gray-500">
                    {playerColor === 'white' ? 'Trắng' : 'Đen'}
                  </p>
                </div>
              </div>
              <div
                className={`font-mono text-2xl font-bold px-3 py-1 rounded-lg ${isPlayerTurn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="p-4 flex items-center gap-2">
              {isOwner && room.status !== 'playing' ? (
                <Button
                  onClick={handleStartGame}
                  loading={showStartBusy}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  Bắt đầu
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowResignConfirm(true)}
                  disabled={gamePhase !== 'playing'}
                >
                  <Flag className="w-4 h-4" />
                  Đầu hàng
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/rooms')}>
                <ArrowLeft className="w-4 h-4" />
                Về danh sách
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Phòng</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Tên phòng</p>
                <p className="font-semibold text-gray-900">{room.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Chủ phòng</p>
                <p className="font-semibold text-gray-900">{host?.username || 'Bạn'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Thời gian</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(room.initialTimeSeconds)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Trạng thái</p>
                <p className="font-semibold text-gray-900">
                  {room.status === 'playing' ? 'Đang chơi' : 'Đang chờ'}
                </p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-sm border-none rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Nước đi</h3>
            </div>
            <div className="p-4 max-h-[420px] overflow-y-auto text-sm">
              {moveHistory.length === 0 ? (
                <p className="text-gray-500">Chưa có nước đi nào.</p>
              ) : (
                <div className="space-y-1">
                  {moveHistory.map((move, index) => (
                    <div key={`${move.san}-${index}`} className="flex items-center gap-2">
                      <span className="w-8 text-gray-400">{Math.floor(index / 2) + 1}.</span>
                      <span className="font-mono text-gray-800">{move.san}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Đầu hàng?</h3>
            <p className="text-sm text-gray-600 mb-5">Bạn sẽ thua ván này ngay lập tức.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowResignConfirm(false)} fullWidth>
                Hủy
              </Button>
              <Button variant="danger" onClick={handleResign} fullWidth>
                <Flag className="w-4 h-4" />
                Đầu hàng
              </Button>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'ended' && gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="text-5xl mb-3">{gameResult.result === 'draw' ? '🤝' : '🏆'}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {gameResult.result === 'draw'
                ? 'Hòa'
                : gameResult.result === 'win'
                  ? 'Bạn thắng!'
                  : 'Bạn thua!'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">Lý do: {gameResult.reason}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/rooms')} fullWidth>
                Về phòng
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/rooms/create')}
                fullWidth
                className="bg-blue-600 hover:bg-blue-700"
              >
                Tạo phòng mới
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
