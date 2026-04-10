import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Loader } from '@/components/common'
import { Users, Clock, Lock, Globe } from 'lucide-react'

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

export default function RoomListPage() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [recentRooms, setRecentRooms] = useState([])
  const [publicRooms, setPublicRooms] = useState([])
  const [joiningRoom, setJoiningRoom] = useState(null)

  // Simulate loading data
  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true)
      setRecentRooms([])
      setPublicRooms([])
      setLoading(false)
    }
    loadRooms()
  }, [])

  const handleCreateRoom = () => {
    navigate('/rooms/create')
  }

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) return

    setJoiningRoom(roomCode)
    navigate(`/rooms/join?code=${roomCode.toUpperCase()}`)
    setJoiningRoom(null)
  }

  const handleJoinRoom = (code) => {
    navigate(`/rooms/join?code=${code}`)
  }

  const handleRejoinRoom = (roomId) => {
    navigate(`/rooms/${roomId}`)
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
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-blue-600 mb-3">♟️ Phòng chơi</h1>
          <p className="text-xl text-gray-800">Tạo phòng riêng hoặc tham gia phòng của bạn bè</p>
        </div>

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
                            onClick={() => handleRejoinRoom(room.id)}
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
            {publicRooms.length > 0 && (
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
                                {room.playerCount}/2
                              </span>
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
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Tham gia
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
