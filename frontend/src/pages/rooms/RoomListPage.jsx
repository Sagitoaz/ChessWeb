import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import { Card, Button, Input, Loader } from '@/components/common'
import gameService from '@/services/gameService'
import { Users, Clock, Lock, Globe, RefreshCcw } from 'lucide-react'

const RECENT_ROOMS_KEY = 'chessweb_recent_rooms'

// Helper function to generate avatar from username
const getAvatarColor = (username) => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]
  const index = username.charCodeAt(0) % colors.length
  return colors[index]
}

const UserAvatar = ({ username }) => {
  const initial = username?.charAt(0).toUpperCase() || '?'
  const colorClass = getAvatarColor(username || '')

  return (
    <div
      className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white font-semibold text-sm`}
    >
      {initial}
    </div>
  )
}

const normalizeRoomCode = (value) => String(value || '').trim().toUpperCase()

const readRecentRoomCodes = () => {
  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((code) => normalizeRoomCode(code))
      .filter((code) => code.length >= 4)
      .slice(0, 8)
  } catch {
    return []
  }
}

const saveRecentRoomCode = (code) => {
  const normalized = normalizeRoomCode(code)
  if (!normalized) return

  const current = readRecentRoomCodes()
  const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8)
  localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(next))
}

const mapRoomCard = (room) => {
  const members = Array.isArray(room?.members) ? room.members : []
  const ownerMember = members.find((member) => String(member?.role || '').toLowerCase() === 'owner')
  return {
    id: String(room?.id || room?._id || room?.code || room?.roomCode || ''),
    code: String(room?.code || room?.roomCode || ''),
    name: room?.name || null,
    status: room?.status || 'waiting',
    playerCount: Number(room?.playerCount || members.length || 0),
    maxPlayers: Number(room?.maxPlayers || 2),
    isPrivate: Boolean(room?.isPrivate),
    timeControl: room?.timeControl || 'rapid',
    canJoin: Boolean(
      room?.canJoin ??
        (room?.status === 'waiting' &&
          Number(room?.playerCount || members.length || 0) < Number(room?.maxPlayers || 2))
    ),
    host: {
      username:
        room?.host?.username || room?.owner?.username || ownerMember?.username || 'Chủ phòng',
    },
  }
}

export default function RoomListPage() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recentRooms, setRecentRooms] = useState([])
  const [publicRooms, setPublicRooms] = useState([])
  const [joiningRoom, setJoiningRoom] = useState(null)
  const [loadError, setLoadError] = useState('')

  const loadRooms = useCallback(
    async ({ forceRefresh = false } = {}) => {
      if (!forceRefresh) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setLoadError('')

      try {
        const [publicResult, recentCodes] = await Promise.all([
          gameService.getPublicRooms({
            status: 'waiting',
            limit: 40,
            forceRefresh,
          }),
          Promise.resolve(readRecentRoomCodes()),
        ])

        const publicItems = Array.isArray(publicResult?.items) ? publicResult.items : []
        setPublicRooms(publicItems.map(mapRoomCard))

        if (recentCodes.length > 0) {
          const roomSnapshots = await Promise.all(
            recentCodes.map((code) =>
              gameService
                .getRoom(code)
                .then((response) => response?.data ?? response)
                .catch(() => null)
            )
          )
          const hydratedRecent = roomSnapshots
            .filter(Boolean)
            .map(mapRoomCard)
            .filter((room) => room.code)
          setRecentRooms(hydratedRecent)
        } else {
          setRecentRooms([])
        }
        return true
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || 'Không thể tải danh sách phòng.'
        setLoadError(String(message))
        return false
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadRooms()
    const timer = setInterval(() => {
      void loadRooms({ forceRefresh: true })
    }, 10000)

    return () => clearInterval(timer)
  }, [loadRooms])

  const handleCreateRoom = () => {
    navigate('/rooms/create')
  }

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) return

    const normalized = normalizeRoomCode(roomCode)
    setJoiningRoom(normalized)
    saveRecentRoomCode(normalized)
    navigate(`/rooms/join?code=${normalized}`)
    setJoiningRoom(null)
  }

  const handleJoinRoom = (code) => {
    const normalized = normalizeRoomCode(code)
    saveRecentRoomCode(normalized)
    navigate(`/rooms/join?code=${normalized}`)
  }

  const handleRejoinRoom = (code) => {
    const normalized = normalizeRoomCode(code)
    saveRecentRoomCode(normalized)
    navigate(`/rooms/${normalized}`)
  }

  const handleRefreshRooms = async () => {
    const ok = await loadRooms({ forceRefresh: true })
    if (ok) {
      showNotification({
        type: 'success',
        title: 'Đã làm mới',
        message: 'Danh sách phòng công khai đã được cập nhật.',
      })
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { text: 'Đang chờ', color: 'bg-yellow-100 text-yellow-800' },
      playing: { text: 'Đang chơi', color: 'bg-green-100 text-green-800' },
      finished: { text: 'Đã kết thúc', color: 'bg-gray-100 text-gray-800' },
    }
    const badge = badges[status] || badges.waiting
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-5xl font-bold text-blue-600 mb-3">♟️ Phòng chơi</h1>
          <p className="text-xl text-gray-800">Tạo phòng riêng hoặc tham gia phòng của bạn bè</p>
        </div>
        <div className="flex justify-center mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshRooms}
            loading={refreshing}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCcw size={14} />
            Làm mới danh sách phòng
          </Button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Main Actions */}
        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-2">Bắt đầu chơi</h2>
              <p className="text-gray-600">Chọn cách bạn muốn tham gia trận đấu</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Button
                onClick={handleCreateRoom}
                variant="primary"
                size="lg"
                fullWidth
                className="py-4 bg-blue-600 hover:bg-blue-700"
              >
                <Users size={20} />
                Tạo phòng mới
              </Button>
              <Button
                onClick={() => navigate('/rooms/join')}
                variant="outline"
                size="lg"
                fullWidth
                className="py-4"
              >
                <Lock size={20} />
                Tham gia bằng mã
              </Button>
            </div>

            {/* Join by code inline */}
            <div className="pt-6 border-t border-gray-100">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Tham gia nhanh</h3>
                <p className="text-sm text-gray-600">Nhập mã phòng để vào ngay</p>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="Nhập mã phòng (VD: ABC123)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
                  fullWidth
                  className="text-lg tracking-wider font-mono"
                  maxLength={6}
                />
                <Button
                  onClick={handleJoinByCode}
                  disabled={!roomCode.trim() || joiningRoom}
                  loading={joiningRoom === roomCode}
                  variant="primary"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Tham gia
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" text="Đang tải phòng..." />
          </div>
        ) : (
          <>
            {/* Recent rooms */}
            {recentRooms.length > 0 && (
              <Card
                variant="elevated"
                padding="none"
                className="bg-white shadow-md border-none rounded-xl overflow-hidden"
              >
                <div className="p-8">
                  <h2 className="text-xl font-bold text-blue-400 mb-6">Phòng gần đây</h2>

                  <div className="space-y-3">
                    {recentRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <UserAvatar username={room.host.username} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="font-semibold text-gray-900">
                                {room.name || `Phòng ${room.code}`}
                              </div>
                              {getStatusBadge(room.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users size={14} />
                                {room.host.username}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {room.timeControl}
                              </span>
                              <span className="flex items-center gap-1">
                                {room.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                                {room.isPrivate ? 'Riêng tư' : 'Công khai'}
                              </span>
                              <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {room.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejoinRoom(room.code)}
                          >
                            {room.status === 'playing' ? 'Tiếp tục' : 'Vào phòng'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Public rooms */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-blue-400">Phòng công khai</h2>
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {publicRooms.length} phòng
                  </span>
                </div>

                {publicRooms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                    <p className="text-gray-600 mb-3">Hiện chưa có phòng công khai khả dụng.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreateRoom}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Tạo phòng công khai ngay
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <UserAvatar username={room.host.username} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="font-semibold text-gray-900">
                                {room.name || `Phòng ${room.code}`}
                              </div>
                              <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                <Users size={12} />
                                {room.playerCount}/{room.maxPlayers}
                              </span>
                              {getStatusBadge(room.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users size={14} />
                                {room.host.username}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {room.timeControl}
                              </span>
                              <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {room.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleJoinRoom(room.code)}
                            disabled={!room.canJoin}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {room.canJoin ? 'Tham gia' : 'Đã đầy'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
