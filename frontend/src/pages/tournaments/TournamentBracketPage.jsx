import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Loader } from '@/components/common'
import gameService from '@/services/gameService'
import { ArrowLeft, Trophy, Eye, Play, Crown, ChevronRight, Info } from 'lucide-react'

const normalizeBracket = (tournament, tournamentId) => ({
  tournamentId: tournament?.id || tournament?._id || tournamentId,
  tournamentName: tournament?.name || 'Giải đấu',
  format: tournament?.format || 'Single Elimination',
  rounds: Array.isArray(tournament?.rounds) ? tournament.rounds : [],
})

export default function TournamentBracketPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [bracket, setBracket] = useState(null)

  useEffect(() => {
    const loadBracket = async () => {
      setLoading(true)
      try {
        const response = await gameService.getTournament(tournamentId)
        const payload = response?.data ?? response
        setBracket(normalizeBracket(payload, tournamentId))
      } catch (_error) {
        setBracket(null)
      } finally {
        setLoading(false)
      }
    }

    loadBracket()
  }, [tournamentId])

  const MatchCard = ({ match }) => {
    const getStatusColor = (status) => {
      const colors = {
        completed: 'border-green-300 bg-green-50',
        ongoing: 'border-yellow-300 bg-yellow-50',
        scheduled: 'border-blue-300 bg-blue-50',
        pending: 'border-gray-200 bg-gray-50',
      }
      return colors[status] || colors.pending
    }

    const getStatusBadge = (status) => {
      const badges = {
        completed: { text: 'Đã xong', color: 'bg-green-500 text-white', icon: Trophy },
        ongoing: { text: 'Đang đấu', color: 'bg-yellow-500 text-white', icon: Play },
        scheduled: { text: 'Sắp đấu', color: 'bg-blue-500 text-white', icon: ChevronRight },
        pending: { text: 'Chờ', color: 'bg-gray-400 text-white', icon: Info },
      }
      const badge = badges[status] || badges.pending
      const Icon = badge.icon

      return (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.color}`}
        >
          <Icon size={12} />
          {badge.text}
        </div>
      )
    }

    const isWinner = (playerName) => match.winner === playerName
    const isTBD = (playerName) => playerName === 'TBD'

    return (
      <div
        className={`border-2 rounded-lg transition-all ${getStatusColor(match.status)} ${
          match.status !== 'pending' ? 'hover:shadow-md cursor-pointer' : 'opacity-70'
        }`}
        onClick={() => navigate(`/tournaments/${tournamentId}`)}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-gray-600">{match.id.toUpperCase()}</span>
            {getStatusBadge(match.status)}
          </div>

          <div className="space-y-2">
            {/* Player 1 */}
            <div
              className={`flex items-center justify-between p-2 rounded ${
                isWinner(match.player1?.name)
                  ? 'bg-green-200 font-bold'
                  : isTBD(match.player1?.name)
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {match.player1?.seed && (
                  <span className="text-xs font-mono text-gray-500 w-6">#{match.player1.seed}</span>
                )}
                <span className={`truncate ${isTBD(match.player1?.name) ? 'italic' : ''}`}>
                  {match.player1?.name || 'TBD'}
                </span>
              </div>
              {match.player1?.score !== null && (
                <span className="font-bold text-gray-900 ml-2">{match.player1.score}</span>
              )}
              {isWinner(match.player1?.name) && (
                <Crown size={16} className="text-yellow-600 ml-2" />
              )}
            </div>

            {/* Player 2 */}
            <div
              className={`flex items-center justify-between p-2 rounded ${
                isWinner(match.player2?.name)
                  ? 'bg-green-200 font-bold'
                  : isTBD(match.player2?.name)
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {match.player2?.seed && (
                  <span className="text-xs font-mono text-gray-500 w-6">#{match.player2.seed}</span>
                )}
                <span className={`truncate ${isTBD(match.player2?.name) ? 'italic' : ''}`}>
                  {match.player2?.name || 'TBD'}
                </span>
              </div>
              {match.player2?.score !== null && (
                <span className="font-bold text-gray-900 ml-2">{match.player2.score}</span>
              )}
              {isWinner(match.player2?.name) && (
                <Crown size={16} className="text-yellow-600 ml-2" />
              )}
            </div>
          </div>

          {match.status !== 'pending' && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                className="text-xs"
                onClick={() => navigate(`/tournaments/${tournamentId}`)}
              >
                <Eye size={12} />
                Xem chi tiết
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e1edff] flex items-center justify-center">
        <Loader size="lg" text="Đang tải bracket..." />
      </div>
    )
  }

  if (!bracket) {
    return (
      <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
        <Card
          variant="elevated"
          padding="none"
          className="max-w-md w-full bg-white shadow-md border-none rounded-xl"
        >
          <div className="p-8 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bracket</h2>
            <p className="text-gray-600 mb-4">Giải đấu chưa bắt đầu hoặc không tồn tại</p>
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

  return (
    <div className="min-h-[100dvh] bg-[#e1edff] px-3 py-4 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="mb-4"
          >
            <ArrowLeft size={18} />
            Quay lại chi tiết giải đấu
          </Button>

          <div className="text-center">
            <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-blue-600 mb-2 sm:text-4xl">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10" />
              {bracket.tournamentName}
            </h1>
            <p className="text-base text-gray-800 sm:text-lg">Bracket - {bracket.format}</p>
          </div>
        </div>

        {/* Bracket Visualization */}
        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-3 sm:p-6">
            <div className="overflow-x-auto">
              <div className="min-w-[760px] lg:min-w-[900px]">
                <div className="flex gap-4 justify-center lg:gap-8">
                  {/* Render each round as a column */}
                  {bracket.rounds.map((round, roundIndex) => (
                    <div key={roundIndex} className="flex-1 max-w-xs">
                      <div className="mb-4 text-center">
                        <h3 className="text-lg font-bold text-blue-600 bg-blue-50 py-2 px-4 rounded-lg inline-block">
                          {round.name}
                        </h3>
                      </div>

                      <div
                        className={`space-y-${roundIndex === 0 ? '4' : roundIndex === 1 ? '20' : '40'}`}
                      >
                        {round.matches.map((match, matchIndex) => (
                          <div
                            key={match.id}
                            style={{
                              marginTop:
                                matchIndex > 0
                                  ? roundIndex === 1
                                    ? '120px'
                                    : roundIndex === 2
                                      ? '280px'
                                      : '0px'
                                  : '0px',
                            }}
                          >
                            <MatchCard match={match} roundIndex={roundIndex} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Chú thích:</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-700">Đã hoàn thành</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-700">Đang diễn ra</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">Sắp thi đấu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-gray-700">Chờ kết quả trước đó</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-yellow-600" />
                  <span className="text-gray-700">Người thắng</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <div className="mt-6">
          <Card
            variant="elevated"
            padding="none"
            className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Lưu ý:</p>
                  <p>
                    Click vào các trận đấu để xem chi tiết. Bracket sẽ tự động cập nhật khi có kết
                    quả mới. Các trận đấu &quot;TBD&quot; (To Be Determined) sẽ được xác định sau
                    khi vòng trước kết thúc.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
