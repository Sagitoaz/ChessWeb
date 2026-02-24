import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Loader } from '@/components/common'
import { Users, Clock, Lock, Globe, Sparkles, Zap, Shield } from 'lucide-react'

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
    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white font-semibold text-sm`}>
      {initial}
    </div>
  )
}

// Mock data - sau này sẽ lấy từ API
const MOCK_RECENT_ROOMS = [
  {
    id: 'ABC123',
    code: 'ABC123',
    name: 'Quick Game',
    host: { username: 'Player1', avatar: null },
    timeControl: '10+0',
    isPrivate: false,
    playerCount: 2,
    status: 'playing',
    createdAt: '2026-02-24T10:30:00Z'
  },
  {
    id: 'XYZ789',
    code: 'XYZ789',
    name: 'Casual Match',
    host: { username: 'ChessMaster99', avatar: null },
    timeControl: '15+5',
    isPrivate: true,
    playerCount: 1,
    status: 'waiting',
    createdAt: '2026-02-24T09:15:00Z'
  },
]

const MOCK_PUBLIC_ROOMS = [
  {
    id: 'PUB001',
    code: 'PUB001',
    name: 'Beginner Friendly',
    host: { username: 'ChessNoob', avatar: null },
    timeControl: '10+0',
    isPrivate: false,
    playerCount: 1,
    status: 'waiting',
    createdAt: '2026-02-24T11:00:00Z'
  },
  {
    id: 'PUB002',
    code: 'PUB002',
    name: 'Blitz Battle',
    host: { username: 'SpeedPlayer', avatar: null },
    timeControl: '5+0',
    isPrivate: false,
    playerCount: 1,
    status: 'waiting',
    createdAt: '2026-02-24T11:10:00Z'
  },
]

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setRecentRooms(MOCK_RECENT_ROOMS)
      setPublicRooms(MOCK_PUBLIC_ROOMS)
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
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // TODO: Validate room code with API
    // For now, just navigate
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">♟️ Phòng chơi</h1>
              <p className="text-blue-100 text-lg">
                Tạo phòng riêng hoặc tham gia phòng của bạn bè để đấu cờ vua
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-300" />
                  <span className="text-sm">Chơi ngay lập tức</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-green-300" />
                  <span className="text-sm">Phòng riêng tư</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateRoom} 
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              >
                <Users size={18} />
                Tạo phòng mới
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Users size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1">Tạo phòng</h3>
              <p className="text-blue-100 text-sm">Tạo phòng riêng, mời bạn bè tham gia</p>
            </div>
          </Card>
          
          <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Lock size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1">Nhập mã</h3>
              <p className="text-purple-100 text-sm">Nhập mã 6 ký tự để vào phòng bạn bè</p>
            </div>
          </Card>
          
          <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Zap size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1">Chơi ngay</h3>
              <p className="text-green-100 text-sm">Tham gia phòng công khai có sẵn</p>
            </div>
          </Card>
        </div>

        {/* Join by code */}
        <Card padding="none" className="border-2 border-dashed border-blue-300 bg-blue-50/50">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tham gia bằng mã
                </h2>
                <p className="text-sm text-gray-600">Nhập mã phòng để tham gia ngay</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="Nhập mã phòng (ví dụ: ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
                fullWidth
                className="text-lg tracking-wider font-mono bg-white"
                maxLength={6}
              />
              <Button 
                onClick={handleJoinByCode}
                disabled={!roomCode.trim() || joiningRoom}
                loading={joiningRoom === roomCode}
                size="lg"
              >
                Tham gia
              </Button>
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
            <Card padding="none">
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Phòng gần đây
                </h2>

                {recentRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <Users size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có phòng nào</h3>
                    <p className="text-gray-600 mb-4">Bạn chưa tham gia phòng nào gần đây</p>
                    <div className="flex justify-center gap-3">
                      <Button onClick={handleCreateRoom} variant="primary">
                        <Users size={16} />
                        Tạo phòng mới
                      </Button>
                      <Button variant="outline">
                        <Globe size={16} />
                        Xem phòng công khai
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 hover:bg-white hover:shadow-md transition-all bg-white/50"
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
                              <span className="font-mono text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
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
                )}
              </div>
            </Card>

            {/* Public rooms */}
            {publicRooms.length > 0 && (
              <Card padding="none">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Phòng công khai
                    </h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {publicRooms.length} phòng đang chờ
                    </span>
                  </div>

                  <div className="space-y-3">
                    {publicRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border-2 border-green-200 p-4 hover:bg-green-50 hover:border-green-300 transition-all bg-gradient-to-r from-green-50/50 to-transparent"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <UserAvatar username={room.host.username} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="font-semibold text-gray-900">
                                {room.name || `Phòng ${room.code}`}
                              </div>
                              <span className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
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
                              <span className="font-mono text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                {room.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleJoinRoom(room.code)}
                            className="shadow-sm"
                          >
                            <Zap size={14} />
                            Tham gia ngay
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