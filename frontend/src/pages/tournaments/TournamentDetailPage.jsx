import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Card, Button, Loader, Pagination } from '@/components/common'
import { useNotification } from '@/components/common/Notification'
import gameService from '@/services/gameService'
import { useAuthStore } from '@/store'
import { useTournamentSocket } from '@/hooks'
import {
  ArrowLeft,
  Trophy,
  Users,
  Calendar,
  Clock,
  Award,
  Eye,
  UserX,
  Play,
  XCircle,
  ChevronRight,
  MapPin,
  CheckCircle,
  Target,
} from 'lucide-react'

const resolveDisplayName = (value, fallback = 'Unknown') => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

const mergeTournamentStandings = (participants = [], standings = []) => {
  const standingMap = new Map(
    standings
      .filter((row) => row && typeof row === 'object' && row.userId)
      .map((row) => [String(row.userId), row])
  )

  const merged = participants.map((participant, idx) => {
    const row = standingMap.get(String(participant.userId || participant.id || '')) || {}
    return {
      ...row,
      userId: participant.userId || participant.id || `participant-${idx + 1}`,
      name: resolveDisplayName(row.name, participant.username || `Người chơi ${idx + 1}`),
      seed: Number(row.seed ?? participant.seed ?? idx + 1),
      points: Number(row.points ?? 0),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      played: Number(row.played ?? 0),
      buchholz: Number(row.buchholz ?? 0),
    }
  })

  return merged.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.seed - b.seed
  })
}

const normalizeTournament = (tournament, tournamentId) => ({
  id: tournament?.id || tournament?._id || tournamentId,
  name: tournament?.name || 'Giải đấu',
  organizer:
    typeof tournament?.organizer === 'string'
      ? {
          username: tournament.organizer,
          userId: tournament?.organizerId || tournament?.createdBy || null,
        }
      : tournament?.organizer && typeof tournament.organizer === 'object'
        ? {
            username:
              tournament.organizer.displayName ||
              tournament.organizer.username ||
              tournament.organizer.name ||
              'Unknown',
            userId:
              tournament.organizer.userId ||
              tournament.organizer.id ||
              tournament?.organizerId ||
              tournament?.createdBy ||
              null,
          }
        : {
            username:
              tournament?.organizerName ||
              tournament?.creatorName ||
              tournament?.createdByUsername ||
              'Unknown',
            userId: tournament?.organizerId || tournament?.createdBy || null,
          },
  organizerId: tournament?.organizerId || tournament?.createdBy || tournament?.ownerUserId || null,
  createdBy: tournament?.createdBy || null,
  startDate: tournament?.startDate || tournament?.start_date || new Date().toISOString(),
  registrationDeadline:
    tournament?.registrationDeadline ||
    tournament?.registration_deadline ||
    new Date().toISOString(),
  participants: Array.isArray(tournament?.participants)
    ? tournament.participants
    : Array.isArray(tournament?.players)
      ? tournament.players
      : [],
  maxParticipants: tournament?.maxParticipants || tournament?.max_players || 0,
  format: tournament?.format || 'Unknown',
  timeControl: tournament?.timeControl || tournament?.time_control || '10+0',
  status: tournament?.status || 'registration',
  prize: tournament?.prize || null,
  description: tournament?.description || '',
  currentRound: tournament?.currentRound || null,
  rounds: Array.isArray(tournament?.rounds) ? tournament.rounds : [],
  standings: mergeTournamentStandings(
    Array.isArray(tournament?.participants)
      ? tournament.participants
      : Array.isArray(tournament?.players)
        ? tournament.players
        : [],
    Array.isArray(tournament?.standings) ? tournament.standings : []
  ),
  winner: tournament?.winner || null,
  completedAt: tournament?.completedAt || null,
})

const DETAIL_PAGE_SIZE = 10

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

const isNotFoundError = (error) => {
  const status = Number(error?.response?.status || 0)
  const code = String(error?.response?.data?.error?.code || '').toLowerCase()
  const message = String(
    error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      ''
  ).toLowerCase()
  return status === 404 || code.includes('not_found') || message.includes('not found')
}

export default function TournamentDetailPage() {
  const { showNotification } = useNotification()
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const authUser = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [participantStatus, setParticipantStatus] = useState(null)
  const [participantsPage, setParticipantsPage] = useState(1)
  const [standingsPage, setStandingsPage] = useState(1)
  const [expandedRounds, setExpandedRounds] = useState([])
  const [checkInMinutes, setCheckInMinutes] = useState(3)
  const [pendingAction, setPendingAction] = useState(null)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const participantStatusRef = useRef(null)
  const hasTournamentSnapshotRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const refreshTimerRef = useRef(null)
  const {
    isConnected: isTournamentSocketConnected,
    onPlayerRegistered,
    onPlayerWithdrawn,
    onTournamentStarted,
    onRoundUpdate,
    onMatchReady,
    onTournamentCompleted,
    off,
  } = useTournamentSocket(tournamentId)
  const skipSocketRefreshUntilRef = useRef(0)
  const lastSocketEventKeyRef = useRef('')

  const isActionPending = useCallback(
    (actionKey) => pendingAction === actionKey,
    [pendingAction]
  )

  const patchTournamentMatch = useCallback((matchId, updater) => {
    setTournament((prev) => {
      if (!prev || !Array.isArray(prev.rounds)) return prev

      return {
        ...prev,
        rounds: prev.rounds.map((round) => ({
          ...round,
          matches: Array.isArray(round?.matches)
            ? round.matches.map((match) =>
                String(match?.id || '') === String(matchId || '') ? updater(match) : match
              )
            : [],
        })),
      }
    })
  }, [])

  const authRoles = Array.isArray(authUser?.roles)
    ? authUser.roles.filter((role) => typeof role === 'string')
    : authUser?.role && typeof authUser.role === 'string'
      ? [authUser.role]
      : []

  const currentUserId = authUser?.id || authUser?.userId || authUser?._id || authUser?.sub || null

  const canManageTournament =
    isOrganizer || authRoles.includes('admin') || authRoles.includes('mod')

  const activeParticipants = useMemo(
    () =>
      Array.isArray(tournament?.participants)
        ? tournament.participants.filter((participant) => participant.status === 'active')
        : [],
    [tournament]
  )

  const loadTournament = useCallback(async ({ background = false, retries = 1 } = {}) => {
    if (!tournamentId) return
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    if (!background || !hasTournamentSnapshotRef.current) {
      setLoading(true)
      setIsBackgroundRefreshing(false)
    } else {
      setIsBackgroundRefreshing(true)
    }
    try {
      let response = null
      let lastError = null
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          response = await gameService.getTournament(tournamentId)
          lastError = null
          break
        } catch (error) {
          lastError = error
          if (!isNotFoundError(error) || attempt >= retries) {
            break
          }
          await sleep(300 + attempt * 250)
        }
      }
      if (lastError) throw lastError
      const payload = response?.data ?? response
      const normalized = normalizeTournament(payload, tournamentId)
      setTournament(normalized)
      hasTournamentSnapshotRef.current = true

      const participantRows = Array.isArray(normalized.participants) ? normalized.participants : []
      const currentParticipant =
        currentUserId && participantRows.length > 0
          ? participantRows.find(
              (participant) =>
                participant.userId === currentUserId || participant.id === currentUserId
            )
          : null
      setIsRegistered(Boolean(currentParticipant))
      const nextParticipantStatus = currentParticipant?.status || null
      setParticipantStatus(nextParticipantStatus)
      if (
        participantStatusRef.current &&
        participantStatusRef.current !== nextParticipantStatus &&
        nextParticipantStatus === 'eliminated'
      ) {
        showNotification({
          type: 'error',
          title: 'Loại khỏi giải',
          message: 'Bạn đã bị loại khỏi giải đấu.',
        })
      }
      participantStatusRef.current = nextParticipantStatus
      const ownerCandidates = [payload?.createdBy, payload?.organizerId, payload?.ownerUserId]
        .concat([normalized?.organizerId, normalized?.organizer?.userId])
        .map((value) => {
          if (typeof value === 'string') return value
          if (value && typeof value === 'object' && typeof value.toString === 'function') {
            return value.toString()
          }
          return ''
        })
        .filter(Boolean)

      setIsOrganizer(Boolean(currentUserId && ownerCandidates.includes(String(currentUserId))))
    } catch (error) {
      if (!background || !hasTournamentSnapshotRef.current) {
        setTournament(null)
        hasTournamentSnapshotRef.current = false
      } else {
        showNotification({
          type: 'error',
          title: 'Cập nhật giải đấu thất bại',
          message: getApiErrorMessage(error, 'Không thể làm mới thông tin giải đấu lúc này.'),
        })
      }
    } finally {
      if (!background || !hasTournamentSnapshotRef.current) {
        setLoading(false)
      }
      setIsBackgroundRefreshing(false)
      isRefreshingRef.current = false
    }
  }, [currentUserId, tournamentId, showNotification])

  useEffect(() => {
    void loadTournament({
      retries: location.state?.justCreatedTournament ? 4 : 1,
    })
  }, [loadTournament, location.state?.justCreatedTournament])

  useEffect(() => {
    setParticipantsPage(1)
    setStandingsPage(1)
  }, [activeTab, tournamentId])

  useEffect(() => {
    const rounds = Array.isArray(tournament?.rounds) ? tournament.rounds : []
    if (rounds.length === 0) {
      setExpandedRounds([])
      return
    }

    const preferredRoundIndex = Math.max(0, Number(tournament?.currentRound || 1) - 1)
    setExpandedRounds((prev) => {
      const existing = Array.isArray(prev) ? prev.filter((idx) => idx >= 0 && idx < rounds.length) : []
      if (existing.length > 0) return existing
      return [Math.min(preferredRoundIndex, rounds.length - 1)]
    })
  }, [tournament?.currentRound, tournament?.rounds])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((tournament?.participants?.length || 0) / DETAIL_PAGE_SIZE))
    if (participantsPage > totalPages) {
      setParticipantsPage(totalPages)
    }
  }, [participantsPage, tournament?.participants?.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((tournament?.standings?.length || 0) / DETAIL_PAGE_SIZE))
    if (standingsPage > totalPages) {
      setStandingsPage(totalPages)
    }
  }, [standingsPage, tournament?.standings?.length])

  useEffect(() => {
    if (!isTournamentSocketConnected || !tournamentId) return undefined

    const refreshIfRelevant = (payload, message, options = {}) => {
      if (String(payload?.tournamentId || '') !== String(tournamentId)) return
      const eventKey = [
        payload?.tournamentId || '',
        payload?.matchId || '',
        payload?.userId || '',
        payload?.roundIndex ?? '',
        payload?.at || '',
      ].join(':')
      if (eventKey && lastSocketEventKeyRef.current === eventKey) return
      lastSocketEventKeyRef.current = eventKey
      if (Date.now() < skipSocketRefreshUntilRef.current) return
      if (!options.silent) {
        showNotification({
          type: 'info',
          title: 'Cập nhật giải đấu',
          message: message || 'Giải đấu vừa được cập nhật.',
        })
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = setTimeout(() => {
        void loadTournament({ background: true })
      }, 250)
    }

    const handlePlayerRegistered = (payload) => {
      refreshIfRelevant(payload, '', { silent: true })
    }
    const handlePlayerWithdrawn = (payload) => {
      refreshIfRelevant(payload, '', { silent: true })
    }
    const handleTournamentStarted = (payload) => {
      refreshIfRelevant(payload, 'Giải đấu đã bắt đầu.')
    }
    const handleRoundUpdate = (payload) => {
      refreshIfRelevant(payload, 'Lịch đấu vừa cập nhật, đang làm mới bảng điểm...')
    }
    const handleMatchReady = (payload) => {
      refreshIfRelevant(payload, 'Có bàn đấu mới sẵn sàng.')
    }
    const handleTournamentCompleted = (payload) => {
      refreshIfRelevant(payload, 'Giải đấu đã kết thúc, đang cập nhật kết quả cuối cùng...')
    }

    onPlayerRegistered(handlePlayerRegistered)
    onPlayerWithdrawn(handlePlayerWithdrawn)
    onTournamentStarted(handleTournamentStarted)
    onRoundUpdate(handleRoundUpdate)
    onMatchReady(handleMatchReady)
    onTournamentCompleted(handleTournamentCompleted)

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      off('tournament:playerRegistered', handlePlayerRegistered)
      off('tournament:playerWithdrawn', handlePlayerWithdrawn)
      off('tournament:started', handleTournamentStarted)
      off('tournament:roundUpdate', handleRoundUpdate)
      off('tournament:matchReady', handleMatchReady)
      off('tournament:completed', handleTournamentCompleted)
    }
  }, [
    isTournamentSocketConnected,
    loadTournament,
    off,
    onMatchReady,
    onPlayerRegistered,
    onPlayerWithdrawn,
    onRoundUpdate,
    onTournamentStarted,
    onTournamentCompleted,
    tournamentId,
    showNotification,
  ])

  const handleRegister = async () => {
    if (!tournamentId || pendingAction) return
    setPendingAction('register')
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      await gameService.joinTournament(tournamentId)
      await loadTournament({ background: true })
      showNotification({
        type: 'success',
        title: 'Đăng ký thành công',
        message: 'Yêu cầu tham gia giải đã được gửi.',
      })
    } catch (_error) {
      const message =
        _error?.response?.data?.message ||
        _error?.message ||
        'Không thể đăng ký giải đấu. Vui lòng thử lại.'
      showNotification({
        type: 'error',
        title: 'Lỗi đăng ký',
        message: String(message),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleWithdraw = async () => {
    if (!tournamentId || pendingAction) return
    setPendingAction('withdraw')
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      await gameService.withdrawTournament(tournamentId)
      await loadTournament({ background: true })
      showNotification({
        type: 'success',
        title: 'Đã rút lui',
        message: 'Bạn đã rút khỏi giải đấu.',
      })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi rút lui',
        message: 'Không thể rút lui khỏi giải đấu. Vui lòng thử lại.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleStartTournament = async () => {
    if (!tournamentId || pendingAction) return
    setPendingAction('start-tournament')
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      const response = await gameService.startTournament(tournamentId)
      const payload = response?.data ?? response
      setTournament((prev) =>
        prev
          ? {
              ...prev,
              status: payload?.status || 'ongoing',
              currentRound: payload?.currentRound || prev.currentRound || 1,
              rounds: Array.isArray(payload?.rounds) ? payload.rounds : prev.rounds,
              standings: Array.isArray(payload?.standings) ? payload.standings : prev.standings,
            }
          : prev
      )
      await loadTournament({ background: true })
      showNotification({
        type: 'success',
        title: 'Đã bắt đầu giải',
        message: 'Giải đấu đã chuyển sang trạng thái đang diễn ra.',
      })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi bắt đầu giải',
        message: getApiErrorMessage(
          _error,
          'Không thể bắt đầu giải đấu. Vui lòng kiểm tra số người chơi.'
        ),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleCancelTournament = async () => {
    if (!tournamentId || pendingAction) return
    if (!window.confirm('Bạn có chắc muốn hủy giải đấu này?')) return
    setPendingAction('cancel-tournament')
    try {
      await gameService.cancelTournament(tournamentId)
      showNotification({
        type: 'success',
        title: 'Đã hủy giải',
        message: 'Giải đấu đã được hủy. Đang quay lại danh sách giải đấu.',
      })
      navigate('/tournaments', { replace: true })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi hủy giải',
        message: 'Không thể hủy giải đấu. Vui lòng thử lại.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleSetMatchResult = async (matchId, winnerSlot) => {
    if (!tournamentId || pendingAction) return
    setPendingAction(`set-result:${matchId}:${winnerSlot}`)
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      await gameService.recordTournamentMatchResult(tournamentId, matchId, {
        winnerSlot,
      })
      await loadTournament({ background: true })
      showNotification({
        type: 'success',
        title: 'Đã lưu kết quả',
        message: 'Kết quả trận đấu đã được cập nhật.',
      })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi lưu kết quả',
        message: 'Không thể lưu kết quả trận đấu. Vui lòng thử lại.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleOpenCurrentRound = async () => {
    if (!tournamentId || pendingAction) return
    setPendingAction('open-current-round')
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      const response = await gameService.openTournamentRound(tournamentId, {
        roundIndex: Number(tournament?.currentRound || 1),
        checkInMinutes: Number(checkInMinutes || 3),
      })
      const payload = response?.data ?? response
      setTournament((prev) =>
        prev
          ? {
              ...prev,
              status: payload?.status || prev.status,
              currentRound: payload?.roundIndex || prev.currentRound,
              rounds: Array.isArray(payload?.rounds) ? payload.rounds : prev.rounds,
            }
          : prev
      )
      showNotification({
        type: 'success',
        title: 'Mở bàn đấu',
        message: 'Đã mở bàn đấu cho vòng hiện tại.',
      })
      await loadTournament({ background: true })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi mở vòng',
        message: 'Không thể mở vòng hiện tại. Có thể vòng trước chưa hoàn thành.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleMatchCheckIn = async (matchId) => {
    if (!tournamentId || !matchId || pendingAction) return
    setPendingAction(`check-in:${matchId}`)
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      const response = await gameService.checkInTournamentMatch(tournamentId, matchId)
      const payload = response?.data ?? response
      patchTournamentMatch(matchId, (match) => ({
        ...match,
        gameId: payload?.gameId || match.gameId,
        status: payload?.bothReady ? 'ready' : match.status,
        checkIn: payload?.checkIn && typeof payload.checkIn === 'object' ? payload.checkIn : match.checkIn,
      }))
      showNotification({
        type: 'success',
        title: 'Check-in thành công',
        message: 'Đã check-in thành công. Chờ đối thủ sẵn sàng.',
      })
      await loadTournament({ background: true })
    } catch (_error) {
      showNotification({
        type: 'error',
        title: 'Lỗi check-in',
        message: getApiErrorMessage(_error, 'Không thể check-in cho trận này.'),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleApproveParticipant = async (participantUserId) => {
    if (!tournamentId || pendingAction) return
    setPendingAction(`approve:${participantUserId}`)
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      await gameService.approveTournamentParticipant(tournamentId, participantUserId)
      await loadTournament({ background: true })
    } catch (_error) {
      const message =
        _error?.response?.data?.message ||
        _error?.message ||
        'Không thể duyệt người chơi. Vui lòng thử lại.'
      showNotification({
        type: 'error',
        title: 'Lỗi duyệt người chơi',
        message: String(message),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleRejectParticipant = async (participantUserId) => {
    if (!tournamentId || pendingAction) return
    setPendingAction(`reject:${participantUserId}`)
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      await gameService.rejectTournamentParticipant(tournamentId, participantUserId)
      await loadTournament({ background: true })
    } catch (_error) {
      const message =
        _error?.response?.data?.message ||
        _error?.message ||
        'Không thể từ chối người chơi. Vui lòng thử lại.'
      showNotification({
        type: 'error',
        title: 'Lỗi từ chối người chơi',
        message: String(message),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleStartMatch = async (matchId) => {
    if (!tournamentId || !matchId || pendingAction) return
    setPendingAction(`start-match:${matchId}`)
    try {
      skipSocketRefreshUntilRef.current = Date.now() + 1500
      const response = await gameService.startTournamentMatch(tournamentId, matchId)
      const payload = response?.data ?? response
      patchTournamentMatch(matchId, (match) => ({
        ...match,
        status: payload?.status || 'ongoing',
        startedAt: new Date().toISOString(),
      }))
      showNotification({
        type: 'success',
        title: 'Đã bắt đầu trận',
        message: 'BTC đã mở trận. Người chơi có thể bắt đầu thi đấu ngay bây giờ.',
      })
      await loadTournament({ background: true })
    } catch (_error) {
      const message =
        _error?.response?.data?.message ||
        _error?.message ||
        'Không thể bắt đầu trận này. Hãy kiểm tra cả hai người chơi đã vào phòng.'
      showNotification({
        type: 'error',
        title: 'Lỗi bắt đầu trận',
        message: String(message),
      })
    } finally {
      setPendingAction(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      registration: { text: 'Đang mở đăng ký', color: 'bg-green-100 text-green-800' },
      full: { text: 'Đã đủ người', color: 'bg-blue-100 text-blue-800' },
      ongoing: { text: 'Đang diễn ra', color: 'bg-yellow-100 text-yellow-800' },
      completed: { text: 'Đã kết thúc', color: 'bg-gray-100 text-gray-800' },
    }
    const badge = badges[status] || badges.registration
    return (
      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const getParticipantBadge = (status) => {
    const badges = {
      pending: { text: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800' },
      active: { text: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
      rejected: { text: 'Bị từ chối', color: 'bg-red-100 text-red-800' },
      withdrawn: { text: 'Đã rút lui', color: 'bg-gray-100 text-gray-800' },
      eliminated: { text: 'Đã bị loại', color: 'bg-gray-100 text-gray-800' },
    }

    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.text}</span>
    )
  }

  const UserAvatar = ({ username }) => {
    const initial = username?.charAt(0).toUpperCase() || '?'
    return (
      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
        {initial}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e1edff] flex items-center justify-center">
        <Loader size="lg" text="Đang tải thông tin giải đấu..." />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
        <Card
          variant="elevated"
          padding="none"
          className="max-w-md w-full bg-white shadow-md border-none rounded-xl"
        >
          <div className="p-8 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy giải đấu</h2>
            <p className="text-gray-600 mb-4">Giải đấu này không tồn tại hoặc đã bị xóa</p>
            <Button
              onClick={() => navigate('/tournaments')}
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Quay lại danh sách
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const isRegistrationPhase = ['registration', 'full'].includes(String(tournament.status || ''))
  const registrationDeadlineAt = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).getTime()
    : NaN
  const isRegistrationOpen =
    Number.isFinite(registrationDeadlineAt) && registrationDeadlineAt > Date.now()

  const canRegister =
    isRegistrationPhase &&
    isRegistrationOpen &&
    tournament.participants.length < tournament.maxParticipants &&
    !participantStatus &&
    !isOrganizer

  const participantStateLabel = isOrganizer
    ? 'Bạn là người tạo giải, không thể đăng ký tham gia giải này.'
    : participantStatus === 'pending'
      ? 'Đã đăng ký, đang chờ duyệt'
      : participantStatus === 'active'
        ? 'Đã đăng ký, đã duyệt'
        : participantStatus === 'rejected'
          ? 'Đã bị từ chối'
          : null

  const tournamentWinnerLabel =
    tournament.status === 'completed' && tournament.winner
      ? `Nhà vô địch: ${tournament.winner}`
      : null

  const currentRoundIndex = Math.max(0, Number(tournament.currentRound || 1) - 1)
  const currentRoundData = Array.isArray(tournament.rounds)
    ? tournament.rounds[currentRoundIndex] || null
    : null
  const currentRoundHasRooms = Array.isArray(currentRoundData?.matches)
    ? currentRoundData.matches.some((match) => Boolean(match?.gameId))
    : false
  const participantTotalPages = Math.max(
    1,
    Math.ceil((tournament.participants.length || 0) / DETAIL_PAGE_SIZE)
  )
  const standingsTotalPages = Math.max(
    1,
    Math.ceil((tournament.standings.length || 0) / DETAIL_PAGE_SIZE)
  )
  const visibleParticipants = tournament.participants.slice(
    (participantsPage - 1) * DETAIL_PAGE_SIZE,
    participantsPage * DETAIL_PAGE_SIZE
  )
  const visibleStandings = tournament.standings.slice(
    (standingsPage - 1) * DETAIL_PAGE_SIZE,
    standingsPage * DETAIL_PAGE_SIZE
  )
  const toggleRoundExpanded = (roundIndex) => {
    setExpandedRounds((prev) =>
      prev.includes(roundIndex) ? prev.filter((idx) => idx !== roundIndex) : [...prev, roundIndex]
    )
  }

  return (
    <div className="min-h-screen bg-[#e1edff] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/tournaments')} size="sm">
            <ArrowLeft size={18} />
            Quay lại
          </Button>
        </div>

        {/* Tournament Header Card */}
        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden mb-6"
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy size={32} className="text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    Tổ chức bởi: <strong>{tournament.organizer.username}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {tournament.format}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(tournament.status)}
                {tournament.prize && (
                  <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg">
                    <Award size={16} />
                    <span className="font-semibold">{tournament.prize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Bắt đầu</p>
                <p className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(tournament.startDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Người chơi</p>
                <p className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                  <Users size={14} />
                  {tournament.participants.length}/{tournament.maxParticipants}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Thời gian</p>
                <p className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                  <Clock size={14} />
                  {tournament.timeControl}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Hạn đăng ký</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {new Date(tournament.registrationDeadline).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {canRegister && (
                <Button
                  variant="primary"
                  onClick={handleRegister}
                  loading={isActionPending('register')}
                  disabled={Boolean(pendingAction)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle size={18} />
                  Đăng ký tham gia
                </Button>
              )}
              {participantStateLabel && (
                <div className="flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                  {participantStateLabel}
                </div>
              )}
              {isRegistered && isRegistrationPhase && (
                <Button
                  variant="outline"
                  onClick={handleWithdraw}
                  loading={isActionPending('withdraw')}
                  disabled={Boolean(pendingAction)}
                >
                  <UserX size={18} />
                  Rút lui
                </Button>
              )}
              {tournament.status === 'ongoing' && (
                <Button
                  variant="primary"
                  onClick={() => navigate(`/tournaments/${tournamentId}/bracket`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye size={18} />
                  Xem bracket
                </Button>
              )}
              {canManageTournament && tournament.status === 'ongoing' && !currentRoundHasRooms && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={checkInMinutes}
                    onChange={(event) => setCheckInMinutes(Number(event.target.value || 3))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleOpenCurrentRound}
                    loading={isActionPending('open-current-round')}
                    disabled={Boolean(pendingAction)}
                  >
                    <Play size={16} />
                    Mở bàn vòng {Number(tournament.currentRound || 1)}
                  </Button>
                </div>
              )}
              {canManageTournament && (
                <>
                  {isRegistrationPhase && (
                    <Button
                      variant="primary"
                      onClick={handleStartTournament}
                      loading={isActionPending('start-tournament')}
                      disabled={Boolean(pendingAction) || tournament.participants.length < 2}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play size={18} />
                      Bắt đầu giải đấu
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={handleCancelTournament}
                    loading={isActionPending('cancel-tournament')}
                    disabled={Boolean(pendingAction)}
                  >
                    <XCircle size={18} />
                    Hủy giải đấu
                  </Button>
                </>
              )}
            </div>

            {isBackgroundRefreshing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
                <Loader size="sm" />
                Đang cập nhật thông tin giải đấu...
              </div>
            )}

            {/* Notifications are now global toasts, not local banners */}

            {tournamentWinnerLabel && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {tournamentWinnerLabel}
              </div>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {[
                { key: 'overview', label: 'Tổng quan', icon: Trophy },
                {
                  key: 'participants',
                  label: `Người chơi (${tournament.participants.length})`,
                  icon: Users,
                },
                { key: 'matches', label: 'Theo dõi vòng đấu', icon: Target },
                { key: 'standings', label: 'Bảng điểm', icon: Award },
                { key: 'bracket', label: 'Bracket', icon: MapPin },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Mô tả</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {tournament.description || 'Không có mô tả'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Quy định</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Định dạng: {tournament.format}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Thời gian mỗi ván: {tournament.timeControl}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Số người chơi tối đa: {tournament.maxParticipants}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Hạn đăng ký:{' '}
                        {new Date(tournament.registrationDeadline).toLocaleString('vi-VN')}
                      </span>
                    </li>
                    {tournament.prize && (
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Giải thưởng: {tournament.prize}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Participants Tab */}
            {activeTab === 'participants' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Danh sách người chơi ({tournament.participants.length}/
                  {tournament.maxParticipants})
                </h3>
                <div className="space-y-2">
                  {visibleParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-gray-500 font-mono text-sm w-8">
                          #{participant.seed}
                        </div>
                        <UserAvatar username={participant.username} />
                        <div>
                          <p className="font-semibold text-gray-900">{participant.username}</p>
                          <p className="text-sm text-gray-600">Rating: {participant.rating}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {getParticipantBadge(participant.status)}
                          {canManageTournament && participant.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveParticipant(participant.userId)}
                                loading={isActionPending(`approve:${participant.userId}`)}
                                disabled={Boolean(pendingAction)}
                              >
                                Duyệt
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectParticipant(participant.userId)}
                                loading={isActionPending(`reject:${participant.userId}`)}
                                disabled={Boolean(pendingAction)}
                              >
                                Từ chối
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {participantTotalPages > 1 && (
                  <>
                    <Pagination
                      page={participantsPage}
                      totalPages={participantTotalPages}
                      onPageChange={setParticipantsPage}
                      className="mt-6"
                    />
                    <p className="mt-2 text-center text-xs text-gray-500">
                      Trang {participantsPage}/{participantTotalPages} · {DETAIL_PAGE_SIZE} người mỗi
                      trang
                    </p>
                  </>
                )}

                {canManageTournament &&
                  isRegistrationPhase &&
                  activeParticipants.length >= 2 && (
                    <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="text-base font-bold text-blue-900 mb-3">Xếp cặp tự động</h4>
                      <p className="text-sm text-blue-800">
                        Hệ thống sẽ tự động xếp cặp theo seed khi bạn bấm Bắt đầu giải đấu. Sau đó
                        người tạo giải dùng Mở bàn vòng để điều phối vào trận và thời gian check-in.
                      </p>
                    </div>
                  )}
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Theo dõi các cặp đấu</h3>
                <p className="mb-4 text-sm text-gray-600">
                  Mặc định đang mở vòng hiện tại. Bạn có thể mở thêm các vòng khác để xem hoặc điều
                  phối trận đấu.
                </p>
                {tournament.rounds.map((round, index) => (
                  <div key={index} className="mb-4 rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleRoundExpanded(index)}
                      className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900">{round.name}</h4>
                        <p className="mt-1 text-xs text-gray-500">
                          {Array.isArray(round.matches) ? round.matches.length : 0} cặp đấu
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {index === currentRoundIndex && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Vòng hiện tại
                          </span>
                        )}
                        <ChevronRight
                          size={18}
                          className={`text-gray-500 transition-transform ${
                            expandedRounds.includes(index) ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {expandedRounds.includes(index) && (
                      <div className="space-y-2 border-t border-gray-200 p-4">
                        {round.matches.map((match) => {
                        const player1Name = match.player1?.name || match.player1?.username || 'TBD'
                        const player2Name = match.player2?.name || match.player2?.username || 'TBD'
                        const isCompleted = String(match.status || '').toLowerCase() === 'completed'
                        const checkIn =
                          match?.checkIn && typeof match.checkIn === 'object' ? match.checkIn : null
                        const checkInDeadline = checkIn?.deadlineAt
                          ? new Date(checkIn.deadlineAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : null
                        const bothPlayersReady =
                          Boolean(checkIn?.player1Ready) && Boolean(checkIn?.player2Ready)
                        const matchStatus = String(match?.status || '').toLowerCase()
                        const matchReadyForOrganizerStart =
                          Boolean(match.gameId) &&
                          (bothPlayersReady || matchStatus === 'ready') &&
                          matchStatus !== 'ongoing'
                        const currentUserIsP1 =
                          String(match?.player1?.userId || '') === String(currentUserId || '')
                        const currentUserIsP2 =
                          String(match?.player2?.userId || '') === String(currentUserId || '')
                        const currentUserCanCheckIn =
                          !isCompleted &&
                          checkIn &&
                          (currentUserIsP1 || currentUserIsP2) &&
                          !(
                            (currentUserIsP1 && checkIn?.player1Ready) ||
                            (currentUserIsP2 && checkIn?.player2Ready)
                          )
                        const resultLabel = isCompleted
                          ? match.result === '1-0'
                            ? `${player1Name} thắng`
                            : match.result === '0-1'
                              ? `${player2Name} thắng`
                              : match.result === 'double_forfeit'
                                ? 'Cả hai xử thua (walkover)'
                                : match.result || 'Kết thúc'
                          : matchStatus === 'ready'
                            ? 'Đủ người, chờ BTC bắt đầu'
                            : matchStatus === 'ongoing'
                              ? 'Đang thi đấu'
                              : match.gameId
                                ? 'Phòng đã mở'
                                : 'Chưa thi đấu'

                        return (
                          <div key={match.id} className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{player1Name}</span>
                                  <span className="text-gray-500">vs</span>
                                  <span className="font-medium text-gray-900">{player2Name}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">#{match.id}</p>
                                {match.gameId && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Game ID: {match.gameId}
                                  </p>
                                )}
                                {checkInDeadline && !isCompleted && (
                                  <p className="mt-1 text-xs text-amber-600">
                                    Check-in trước: {checkInDeadline}
                                  </p>
                                )}
                                {checkIn && !isCompleted && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    Ready: {checkIn.player1Ready ? 'P1' : '-'} /{' '}
                                    {checkIn.player2Ready ? 'P2' : '-'}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap justify-end">
                                <span className="font-bold text-blue-600">{resultLabel}</span>
                                {currentUserCanCheckIn && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleMatchCheckIn(match.id)}
                                    loading={isActionPending(`check-in:${match.id}`)}
                                    disabled={Boolean(pendingAction)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <CheckCircle size={14} />
                                    Sẵn sàng
                                  </Button>
                                )}
                                {canManageTournament && match.status !== 'completed' && (
                                  <>
                                    {matchReadyForOrganizerStart && (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          loading={isActionPending(`start-match:${match.id}`)}
                                          disabled={Boolean(pendingAction)}
                                          className="bg-indigo-600 hover:bg-indigo-700"
                                          onClick={() => handleStartMatch(match.id)}
                                        >
                                          <Play size={14} />
                                          BTC bắt đầu trận
                                        </Button>
                                      )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetMatchResult(match.id, 'player1')}
                                      loading={isActionPending(`set-result:${match.id}:player1`)}
                                      disabled={Boolean(pendingAction)}
                                    >
                                      Xác nhận {player1Name} thắng
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetMatchResult(match.id, 'player2')}
                                      loading={isActionPending(`set-result:${match.id}:player2`)}
                                      disabled={Boolean(pendingAction)}
                                    >
                                      Xác nhận {player2Name} thắng
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    match.gameId
                                      ? match.status === 'completed'
                                        ? navigate(`/replays/${match.gameId}`)
                                        : navigate(
                                            `/tournaments/${tournamentId}/matches/${match.gameId}/play`
                                          )
                                      : navigate(`/tournaments/${tournamentId}/bracket`)
                                  }
                                >
                                  <Eye size={14} />
                                  {match.gameId
                                    ? match.status === 'completed'
                                      ? 'Xem ván'
                                      : canManageTournament
                                        ? 'Vào phòng / xem'
                                        : 'Vào phòng'
                                    : 'Xem'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'standings' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Bảng điểm giải đấu</h3>
                {tournament.standings.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
                    Chưa có dữ liệu bảng điểm. Bảng điểm sẽ xuất hiện khi giải đấu bắt đầu và có kết
                    quả.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Người chơi</th>
                          <th className="px-3 py-2 text-right">Điểm</th>
                          <th className="px-3 py-2 text-right">Thắng</th>
                          <th className="px-3 py-2 text-right">Thua</th>
                          <th className="px-3 py-2 text-right">Đã đấu</th>
                          <th className="px-3 py-2 text-right">Tie-break</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStandings.map((row, idx) => (
                          <tr
                            key={row.userId || `${row.name}-${idx}`}
                            className="border-t border-gray-100"
                          >
                            <td className="px-3 py-2 font-semibold text-gray-900">
                              {(standingsPage - 1) * DETAIL_PAGE_SIZE + idx + 1}
                            </td>
                            <td className="px-3 py-2 text-gray-900">{row.name || 'Unknown'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-700">
                              {typeof row.points === 'number' ? row.points : 0}
                            </td>
                            <td className="px-3 py-2 text-right">{row.wins ?? 0}</td>
                            <td className="px-3 py-2 text-right">{row.losses ?? 0}</td>
                            <td className="px-3 py-2 text-right">{row.played ?? 0}</td>
                            <td className="px-3 py-2 text-right">{row.buchholz ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {standingsTotalPages > 1 && (
                  <>
                    <Pagination
                      page={standingsPage}
                      totalPages={standingsTotalPages}
                      onPageChange={setStandingsPage}
                      className="mt-6"
                    />
                    <p className="mt-2 text-center text-xs text-gray-500">
                      Trang {standingsPage}/{standingsTotalPages} · {DETAIL_PAGE_SIZE} dòng mỗi trang
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Bracket Tab */}
            {activeTab === 'bracket' && (
              <div className="text-center py-12">
                <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Xem Bracket</h3>
                <p className="text-gray-600 mb-4">Bracket sẽ hiển thị khi giải đấu bắt đầu</p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/tournaments/${tournamentId}/bracket`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mở trang Bracket
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
