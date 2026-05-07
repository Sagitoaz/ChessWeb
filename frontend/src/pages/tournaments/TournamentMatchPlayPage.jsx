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
import { buildMovePairs, getMoveLabel } from '@/utils/moveNotation'
import { getUserDisplayName } from '@/utils/userDisplay'
import { DEFAULT_INITIAL_FEN, getGameMoves, getGamePlayerId, getInitialFen } from '@/utils/gameShape'

const INITIAL_FEN = DEFAULT_INITIAL_FEN

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

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const objectIdMatch = trimmed.match(/^ObjectId\("([a-fA-F0-9]{24})"\)$/)
    return objectIdMatch?.[1] || trimmed
  }
  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid
    if (typeof value.id === 'string') return value.id
    if (typeof value._id === 'string') return value._id
    if (typeof value.userId === 'string') return value.userId
    if (typeof value.sub === 'string') return value.sub
  }
  return String(value)
}

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

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
  const [matchStatus, setMatchStatus] = useState('pending')
  const [gameStatus, setGameStatus] = useState('pending')
  const [matchCheckIn, setMatchCheckIn] = useState(null)
  const [isSpectator, setIsSpectator] = useState(false)
  const [participantStatus, setParticipantStatus] = useState(null)
  const [submittingResign, setSubmittingResign] = useState(false)
  const [submittingReady, setSubmittingReady] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingLeavePath, setPendingLeavePath] = useState(null)
  const [submittingLeave, setSubmittingLeave] = useState(false)

  const chessRef = useRef(new Chess(INITIAL_FEN))
  const isLoadingGameRef = useRef(false)

  const currentUserId = normalizeId(
    authUser?.id || authUser?.userId || authUser?._id || authUser?.sub || null
  )
  const authRoles = useMemo(
    () =>
      Array.isArray(authUser?.roles)
        ? authUser.roles.filter((role) => typeof role === 'string')
        : authUser?.role && typeof authUser.role === 'string'
          ? [authUser.role]
          : [],
    [authUser?.role, authUser?.roles]
  )

  const {
    isConnected: isSocketConnected,
    joinGame,
    sendMove,
    resign,
    onMoveUpdate,
    onGameEnd,
    onGameStatus,
    off,
  } = useGameSocket(gameId)

  const isParticipant = currentUserId === whitePlayerId || currentUserId === blackPlayerId
  const myTurn = chessRef.current.turn() === (playerColor === 'white' ? 'w' : 'b')
  const isFinished = Boolean(resultText)
  const bothPlayersReady = Boolean(matchCheckIn?.player1Ready) && Boolean(matchCheckIn?.player2Ready)
  const amReady =
    (playerColor === 'white' && Boolean(matchCheckIn?.player1Ready)) ||
    (playerColor === 'black' && Boolean(matchCheckIn?.player2Ready))

  const loadGame = useCallback(async () => {
    if (!gameId) return
    if (isLoadingGameRef.current) return
    isLoadingGameRef.current = true
    setLoading(true)
    setError('')

    try {
      const payload = await gameService.getGameById(gameId)
      const game = payload?.data ?? payload

      const whitePlayerId = normalizeId(getGamePlayerId(game, 'white'))
      const blackPlayerId = normalizeId(getGamePlayerId(game, 'black'))
      const userIsParticipant =
        Boolean(currentUserId) &&
        (whitePlayerId === currentUserId || blackPlayerId === currentUserId)

      setWhitePlayerId(whitePlayerId)
      setBlackPlayerId(blackPlayerId)
      setGameStatus(String(game?.status || game?.state || 'pending').toLowerCase())
      if (whitePlayerId && whitePlayerId === currentUserId) {
        setPlayerColor('white')
      } else if (blackPlayerId && blackPlayerId === currentUserId) {
        setPlayerColor('black')
      }
      setWhiteName(getUserDisplayName(game?.whitePlayer, game?.whiteUsername || 'Người chơi Trắng'))
      setBlackName(getUserDisplayName(game?.blackPlayer, game?.blackUsername || 'Người chơi Đen'))

      chessRef.current = new Chess(String(getInitialFen(game) || INITIAL_FEN))
      const moves = getGameMoves(game)
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
        setMatchStatus(String(match?.status || game?.status || 'pending').toLowerCase())
        setMatchCheckIn(match?.checkIn && typeof match.checkIn === 'object' ? match.checkIn : null)

        const participants = Array.isArray(tournament?.participants) ? tournament.participants : []
        const me = participants.find(
          (participant) => normalizeId(participant?.userId || '') === currentUserId
        )
        const status = me?.status || null
        setParticipantStatus(status)
        const organizerCandidates = [
          tournament?.createdBy,
          tournament?.organizerId,
          tournament?.ownerUserId,
          tournament?.organizer?.userId,
          tournament?.organizer?._id,
          tournament?.organizer?.id,
        ].map((value) => normalizeId(value))
        const userCanSpectate =
          authRoles.includes('admin') ||
          authRoles.includes('mod') ||
          organizerCandidates.includes(String(currentUserId || ''))
        setIsSpectator(Boolean(!userIsParticipant && userCanSpectate))
        if (!userIsParticipant && !userCanSpectate) {
          setError('Bạn không có quyền vào phòng đấu này.')
          return
        }
        if (status === 'eliminated') {
          showNotification({
            type: 'error',
            title: 'Loại khỏi giải',
            message: 'Bạn đã bị loại khỏi giải đấu.',
          })
        }
      } else if (!userIsParticipant) {
        setError('Bạn không phải người chơi của trận đấu này.')
        return
      }
    } catch (loadError) {
      showNotification({
        type: 'error',
        title: 'Lỗi tải trận',
        message: loadError?.message || 'Không thể tải trận đấu tournament.',
      })
    } finally {
      isLoadingGameRef.current = false
      setLoading(false)
    }
  }, [authRoles, currentUserId, gameId, tournamentId, showNotification])

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

    const handleGameStatus = (payload) => {
      if (String(payload?.matchId || '') !== String(gameId || '')) return
      if (typeof payload?.status === 'string') {
        setMatchStatus(String(payload.status).toLowerCase())
      }
      if (typeof payload?.gameStatus === 'string') {
        setGameStatus(String(payload.gameStatus).toLowerCase())
      }
      if (payload?.checkIn && typeof payload.checkIn === 'object') {
        setMatchCheckIn(payload.checkIn)
      }
    }

    onMoveUpdate(handleMoveUpdate)
    onGameEnd(handleGameEnd)
    onGameStatus(handleGameStatus)

    return () => {
      off('game:moveUpdate', handleMoveUpdate)
      off('game:end', handleGameEnd)
      off('game:status', handleGameStatus)
    }
  }, [currentUserId, gameId, loadGame, off, onGameEnd, onGameStatus, onMoveUpdate, showNotification])

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

  const matchStarted = matchStatus === 'ongoing' && gameStatus === 'active'
  const boardDisabled = Boolean(resultText) || !isParticipant || !matchStarted || !myTurn

  const turnLabel = normalizeTurnLabel(chessRef.current.turn())
  const myDisplayName = authUser?.displayName || authUser?.username || 'Bạn'
  const mySideLabel = playerColor === 'white' ? 'Trắng' : 'Đen'
  const myOpponentName = playerColor === 'white' ? blackName : whiteName
  const canResign = !isFinished && !submittingResign && isParticipant
  const isInLiveMatch =
    !isFinished &&
    isParticipant &&
    matchStarted &&
    Boolean(gameId) &&
    Boolean(whitePlayerId && blackPlayerId)

  const handleCheckIn = useCallback(async () => {
    if (!tournamentId || !matchIdInBracket || !isParticipant || amReady || submittingReady) return

    setSubmittingReady(true)
    try {
      const response = await gameService.checkInTournamentMatch(tournamentId, matchIdInBracket)
      const payload = response?.data ?? response
      if (payload?.checkIn && typeof payload.checkIn === 'object') {
        setMatchCheckIn(payload.checkIn)
      }
      if (payload?.bothReady) {
        setMatchStatus('ready')
      }
      showNotification({
        type: 'success',
        title: 'Đã vào phòng',
        message:
          'Bạn đã xác nhận có mặt trong phòng. Chờ đối thủ và BTC bắt đầu trận đấu.',
      })
      await loadGame()
    } catch (submitError) {
      const message =
        getApiErrorMessage(submitError, 'Không thể xác nhận có mặt trong phòng đấu.')
      showNotification({
        type: 'error',
        title: 'Không thể vào phòng',
        message: String(message),
      })
    } finally {
      setSubmittingReady(false)
    }
  }, [
    amReady,
    isParticipant,
    loadGame,
    matchIdInBracket,
    showNotification,
    submittingReady,
    tournamentId,
  ])

  const handleLeaveRequest = useCallback(
    (destination = `/tournaments/${tournamentId}`) => {
      if (isInLiveMatch) {
        setPendingLeavePath(destination)
        setShowLeaveConfirm(true)
        return
      }
      navigate(destination)
    },
    [isInLiveMatch, navigate, tournamentId]
  )

  const handleForfeitAndLeave = useCallback(async () => {
    const destination = pendingLeavePath || `/tournaments/${tournamentId}`

    setSubmittingLeave(true)
    try {
      if (isInLiveMatch && tournamentId && gameId) {
        const targetMatchId = matchIdInBracket || gameId
        await gameService.resignTournamentMatch(tournamentId, targetMatchId)
        if (isSocketConnected) {
          resign()
        }
        showNotification({
          type: 'info',
          title: 'Rời trận',
          message: 'Bạn đã rời trận giữa chừng và bị tính thua.',
        })
      }
    } catch (submitError) {
      const message =
        getApiErrorMessage(
          submitError,
          'Không thể cập nhật kết quả đầu hàng trước khi rời trận.'
        )
      showNotification({
        type: 'error',
        title: 'Rời trận thất bại',
        message: String(message),
      })
    } finally {
      setSubmittingLeave(false)
      setShowLeaveConfirm(false)
      setPendingLeavePath(null)
      navigate(destination)
    }
  }, [
    gameId,
    isInLiveMatch,
    isSocketConnected,
    matchIdInBracket,
    navigate,
    pendingLeavePath,
    resign,
    showNotification,
    tournamentId,
  ])

  useEffect(() => {
    if (!isInLiveMatch) return

    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isInLiveMatch])

  useEffect(() => {
    if (!isInLiveMatch) return

    const handleDocumentNavigation = (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (href.startsWith('#') && !href.startsWith('#/')) return
      if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey) return

      let targetPath = null
      if (href.startsWith('#/')) {
        targetPath = href.slice(1)
      } else {
        const resolved = new URL(href, window.location.origin)
        if (resolved.origin !== window.location.origin) return
        targetPath = resolved.hash?.startsWith('#/')
          ? resolved.hash.slice(1)
          : `${resolved.pathname}${resolved.search}${resolved.hash}`
      }
      const currentPath = window.location.hash?.startsWith('#/')
        ? window.location.hash.slice(1)
        : `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (!targetPath || targetPath === currentPath) return

      event.preventDefault()
      event.stopPropagation()
      setPendingLeavePath(targetPath)
      setShowLeaveConfirm(true)
    }

    document.addEventListener('click', handleDocumentNavigation, true)
    return () => document.removeEventListener('click', handleDocumentNavigation, true)
  }, [isInLiveMatch])

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
        getApiErrorMessage(
          submitError,
          'Không thể cập nhật kết quả đầu hàng. Vui lòng thử lại.'
        )
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
    return buildMovePairs(moveHistory).map((pair) => ({
      fullMove: pair.fullMove,
      whiteMove: getMoveLabel(pair.white),
      blackMove: getMoveLabel(pair.black),
    }))
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
                onClick={() => handleLeaveRequest(`/tournaments/${tournamentId}`)}
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
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rời trận khi đang đấu?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Nếu rời trận tournament giữa chừng, hệ thống sẽ tính bạn thua.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLeaveConfirm(false)
                  setPendingLeavePath(null)
                }}
                fullWidth
              >
                Ở lại
              </Button>
              <Button
                variant="danger"
                onClick={handleForfeitAndLeave}
                loading={submittingLeave}
                fullWidth
              >
                Rời và nhận thua
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white px-5 py-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => handleLeaveRequest(`/tournaments/${tournamentId}`)}
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
              {isSpectator ? (
                <span className="font-bold">Bạn đang theo dõi trận với vai trò BTC/giám sát</span>
              ) : (
                <>
                  Bạn cầm quân <span className="font-bold">{mySideLabel}</span>
                </>
              )}
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
              {!isSpectator && playerColor === 'white' && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={blackName} size="sm" fallbackColor="gray" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Đen</p>
                  <p className="font-semibold text-gray-900 leading-tight">{blackName}</p>
                </div>
              </div>
              {!isSpectator && playerColor === 'black' && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            {isSpectator ? (
              <>
                <p>
                  BTC/giám sát: <span className="font-semibold">{myDisplayName}</span>
                </p>
                <p>
                  Đang theo dõi: <span className="font-semibold">{whiteName}</span> vs{' '}
                  <span className="font-semibold">{blackName}</span>
                </p>
              </>
            ) : (
              <>
                <p>
                  Bạn: <span className="font-semibold">{myDisplayName}</span> ({mySideLabel})
                </p>
                <p>
                  Đối thủ: <span className="font-semibold">{myOpponentName}</span>
                </p>
              </>
            )}
          </div>

          <div className="mt-1 flex gap-2">
            {isParticipant && !isFinished && !amReady && !matchStarted && (
              <Button
                variant="primary"
                disabled={submittingReady}
                onClick={handleCheckIn}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submittingReady ? 'Đang xác nhận...' : 'Tôi đã vào phòng'}
              </Button>
            )}
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

          {!matchStarted && !isFinished && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {isSpectator
                ? bothPlayersReady
                  ? 'Cả hai người chơi đã vào phòng. BTC có thể quay lại trang giải để bấm bắt đầu trận.'
                  : 'BTC đang theo dõi phòng chờ. Trận sẽ chỉ bắt đầu khi cả hai người chơi xác nhận có mặt.'
                : amReady
                  ? 'Bạn đã vào phòng. Chờ đối thủ xác nhận và BTC bắt đầu trận.'
                  : 'Hãy bấm "Tôi đã vào phòng" để BTC thấy bạn đã sẵn sàng thi đấu.'}
            </div>
          )}

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
