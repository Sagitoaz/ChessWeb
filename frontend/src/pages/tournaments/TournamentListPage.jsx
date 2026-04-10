import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Loader } from '@/components/common'
import gameService from '@/services/gameService'
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Search,
  Plus,
  ChevronRight,
  Award,
  Target,
} from 'lucide-react'

const EMPTY_TOURNAMENTS = { upcoming: [], ongoing: [], completed: [] }

const normalizeTournament = (tournament = {}) => ({
  ...tournament,
  id: tournament.id || tournament._id,
  name: tournament.name || 'Giải đấu',
  organizer:
    typeof tournament.organizer === 'string'
      ? tournament.organizer
      : tournament.organizer?.username || 'Unknown',
  startDate: tournament.startDate || tournament.start_date || new Date().toISOString(),
  registrationDeadline: tournament.registrationDeadline || tournament.registration_deadline || null,
  participants: Array.isArray(tournament.participants)
    ? tournament.participants.length
    : tournament.participants || 0,
  maxParticipants: tournament.maxParticipants || tournament.max_players || 0,
  format: tournament.format || 'Unknown',
  timeControl: tournament.timeControl || tournament.time_control || '10+0',
  status: tournament.status || 'registration',
})

const groupTournamentsByStatus = (items = []) =>
  items.reduce(
    (acc, item) => {
      const t = normalizeTournament(item)
      if (t.status === 'ongoing') acc.ongoing.push(t)
      else if (t.status === 'completed') acc.completed.push(t)
      else acc.upcoming.push(t)
      return acc
    },
    { upcoming: [], ongoing: [], completed: [] }
  )

export default function TournamentListPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState(EMPTY_TOURNAMENTS)

  useEffect(() => {
    const loadTournaments = async () => {
      setLoading(true)
      try {
        const response = await gameService.getTournaments()
        const payload = response?.data ?? response
        const items = payload?.items || payload?.tournaments || payload || []
        setTournaments(groupTournamentsByStatus(Array.isArray(items) ? items : []))
      } catch (_error) {
        setTournaments(EMPTY_TOURNAMENTS)
      } finally {
        setLoading(false)
      }
    }

    loadTournaments()
  }, [])

  const getStatusBadge = (status) => {
    const badges = {
      registration: { text: 'Đang mở', color: 'bg-green-100 text-green-800' },
      full: { text: 'Đã đủ', color: 'bg-blue-100 text-blue-800' },
      ongoing: { text: 'Đang diễn ra', color: 'bg-yellow-100 text-yellow-800' },
      completed: { text: 'Đã kết thúc', color: 'bg-gray-100 text-gray-800' },
    }
    const badge = badges[status] || badges.registration
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const getFormatBadge = (format) => {
    const colors = {
      'Single Elimination': 'bg-purple-100 text-purple-800',
      'Double Elimination': 'bg-indigo-100 text-indigo-800',
      'Round Robin': 'bg-blue-100 text-blue-800',
      Swiss: 'bg-teal-100 text-teal-800',
    }
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${colors[format] || 'bg-gray-100 text-gray-800'}`}
      >
        {format}
      </span>
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const TournamentCard = ({ tournament }) => (
    <Card
      variant="elevated"
      padding="none"
      className="bg-white shadow-md border-none rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/tournaments/${tournament.id}`)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={14} />
              <span>Tổ chức bởi: {tournament.organizer}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(tournament.status)}
            {getFormatBadge(tournament.format)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Thời gian bắt đầu</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(tournament.startDate)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Số người chơi</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Users size={14} />
              {tournament.participants}/{tournament.maxParticipants}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Thời gian mỗi ván</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Clock size={14} />
              {tournament.timeControl}
            </p>
          </div>
          {tournament.prize && (
            <div>
              <p className="text-gray-600 mb-1">Giải thưởng</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Award size={14} />
                {tournament.prize}
              </p>
            </div>
          )}
          {tournament.currentRound && (
            <div>
              <p className="text-gray-600 mb-1">Vòng hiện tại</p>
              <p className="font-medium text-gray-900">{tournament.currentRound}</p>
            </div>
          )}
          {tournament.winner && (
            <div>
              <p className="text-gray-600 mb-1">Người thắng</p>
              <p className="font-medium text-blue-600 flex items-center gap-1">
                <Trophy size={14} />
                {tournament.winner}
              </p>
            </div>
          )}
          {tournament.registrationDeadline && tournament.status === 'registration' && (
            <div>
              <p className="text-gray-600 mb-1">Hạn đăng ký</p>
              <p className="font-medium text-orange-600 text-xs">
                {formatDate(tournament.registrationDeadline)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            {tournament.status === 'registration' && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/tournaments/${tournament.id}`)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Đăng ký
              </Button>
            )}
            {tournament.status === 'ongoing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/tournaments/${tournament.id}`)
                }}
              >
                Xem chi tiết
              </Button>
            )}
            {tournament.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/tournaments/${tournament.id}`)
                }}
              >
                Xem kết quả
              </Button>
            )}
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </div>
      </div>
    </Card>
  )

  const filteredTournaments =
    tournaments[activeTab]?.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.organizer.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  return (
    <div className="min-h-screen bg-[#e1edff] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-blue-600 mb-3">🏆 Giải đấu</h1>
          <p className="text-xl text-gray-800">Tham gia hoặc tổ chức giải đấu cờ vua</p>
        </div>

        {/* Main Card */}
        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden mb-6"
        >
          <div className="p-6">
            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    placeholder="Tìm kiếm giải đấu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    fullWidth
                  />
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate('/tournaments/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={18} />
                Tạo giải đấu
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {[
                { key: 'upcoming', label: 'Sắp diễn ra', count: tournaments.upcoming.length },
                { key: 'ongoing', label: 'Đang diễn ra', count: tournaments.ongoing.length },
                { key: 'completed', label: 'Đã kết thúc', count: tournaments.completed.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Tournament List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader size="lg" text="Đang tải giải đấu..." />
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Trophy size={48} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Không tìm thấy giải đấu' : 'Chưa có giải đấu nào'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Hãy là người đầu tiên tạo giải đấu mới'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/tournaments/create')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Tạo giải đấu
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-md border-none rounded-xl overflow-hidden"
          >
            <div className="p-4 text-center">
              <Trophy size={32} className="mx-auto mb-2 text-blue-600" />
              <h3 className="font-bold text-gray-900 mb-1">Tham gia giải đấu</h3>
              <p className="text-sm text-gray-600">Thử thách bản thân với các kỳ thủ khác</p>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-md border-none rounded-xl overflow-hidden"
          >
            <div className="p-4 text-center">
              <Target size={32} className="mx-auto mb-2 text-purple-600" />
              <h3 className="font-bold text-gray-900 mb-1">Nhiều định dạng</h3>
              <p className="text-sm text-gray-600">Single/Double Elim, Round Robin, Swiss</p>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="none"
            className="bg-white shadow-md border-none rounded-xl overflow-hidden"
          >
            <div className="p-4 text-center">
              <Award size={32} className="mx-auto mb-2 text-yellow-600" />
              <h3 className="font-bold text-gray-900 mb-1">Giải thưởng</h3>
              <p className="text-sm text-gray-600">Tranh tài để giành giải thưởng hấp dẫn</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
