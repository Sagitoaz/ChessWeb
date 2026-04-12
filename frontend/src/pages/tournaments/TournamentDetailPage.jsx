import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Loader } from '@/components/common'
import gameService from '@/services/gameService'
import { useAuthStore } from '@/store'
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

const normalizeTournament = (tournament, tournamentId) => ({
  id: tournament?.id || tournament?._id || tournamentId,
  name: tournament?.name || 'Giải đấu',
  organizer:
    typeof tournament?.organizer === 'string'
      ? { username: tournament.organizer }
      : tournament?.organizer || { username: 'Unknown' },
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
})

export default function TournamentDetailPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return
    setLoading(true)
    setActionError('')
    try {
      const response = await gameService.getTournament(tournamentId)
      const payload = response?.data ?? response
      const normalized = normalizeTournament(payload, tournamentId)
      setTournament(normalized)

      const currentUserId = authUser?.id
      const participantRows = Array.isArray(normalized.participants) ? normalized.participants : []
      setIsRegistered(
        Boolean(
          currentUserId &&
          participantRows.some(
            (participant) =>
              participant.userId === currentUserId || participant.id === currentUserId
          )
        )
      )
      setIsOrganizer(Boolean(currentUserId && payload?.createdBy === currentUserId))
    } catch (_error) {
      setTournament(null)
    } finally {
      setLoading(false)
    }
  }, [authUser?.id, tournamentId])

  useEffect(() => {
    void loadTournament()
  }, [loadTournament])

  const handleRegister = async () => {
    if (!tournamentId) return
    try {
      await gameService.joinTournament(tournamentId)
      await loadTournament()
    } catch (_error) {
      setActionError('Không thể đăng ký giải đấu. Vui lòng thử lại.')
    }
  }

  const handleWithdraw = async () => {
    if (!tournamentId) return
    try {
      await gameService.withdrawTournament(tournamentId)
      await loadTournament()
    } catch (_error) {
      setActionError('Không thể rút lui khỏi giải đấu. Vui lòng thử lại.')
    }
  }

  const handleStartTournament = async () => {
    if (!tournamentId) return
    try {
      await gameService.startTournament(tournamentId)
      await loadTournament()
    } catch (_error) {
      setActionError('Không thể bắt đầu giải đấu. Vui lòng kiểm tra số người chơi.')
    }
  }

  const handleCancelTournament = () => {
    // TODO: Real implementation
    if (confirm('Bạn có chắc muốn hủy giải đấu này?')) {
      navigate('/tournaments')
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

  const canRegister =
    tournament.status === 'registration' &&
    tournament.participants.length < tournament.maxParticipants &&
    !isRegistered

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
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle size={18} />
                  Đăng ký tham gia
                </Button>
              )}
              {isRegistered && tournament.status === 'registration' && (
                <Button variant="outline" onClick={handleWithdraw}>
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
              {isOrganizer && (
                <>
                  {tournament.status === 'registration' && (
                    <Button
                      variant="primary"
                      onClick={handleStartTournament}
                      disabled={tournament.participants.length < 2}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play size={18} />
                      Bắt đầu giải đấu
                    </Button>
                  )}
                  <Button variant="danger" onClick={handleCancelTournament}>
                    <XCircle size={18} />
                    Hủy giải đấu
                  </Button>
                </>
              )}
            </div>

            {actionError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
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
                { key: 'matches', label: 'Kết quả', icon: Target },
                { key: 'bracket', label: 'Bracket', icon: MapPin },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
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
                  {tournament.participants.map((participant) => (
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
                        {participant.status === 'active' && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Đang chơi
                          </span>
                        )}
                        {participant.status === 'eliminated' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                            Đã bị loại
                          </span>
                        )}
                        {participant.status === 'withdrawn' && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                            Đã rút lui
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Kết quả các trận</h3>
                {tournament.rounds.map((round, index) => (
                  <div key={index} className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">{round.name}</h4>
                    <div className="space-y-2">
                      {round.matches.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{match.player1}</span>
                              <span className="text-gray-500">vs</span>
                              <span className="font-medium text-gray-900">{match.player2}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {match.result ? (
                              <span className="font-bold text-blue-600">{match.result}</span>
                            ) : (
                              <span className="text-gray-500 text-sm">Chưa thi đấu</span>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye size={14} />
                              Xem
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
