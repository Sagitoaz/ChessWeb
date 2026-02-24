import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/common'
import { Users, Clock, Lock, Globe, Copy, Check, Share2, ArrowLeft, Play } from 'lucide-react'

// Time control options
const TIME_CONTROLS = [
  { value: '5+0', label: '5 min', description: 'Blitz' },
  { value: '10+0', label: '10 min', description: 'Rapid' },
  { value: '15+10', label: '15+10', description: 'Standard' },
  { value: '30+0', label: '30 min', description: 'Classical' },
]

const INCREMENTS = [
  { value: 0, label: 'Không' },
  { value: 5, label: '+5 giây' },
  { value: 10, label: '+10 giây' },
  { value: 15, label: '+15 giây' },
]

// Generate random room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function CreateRoomPage() {
  const navigate = useNavigate()
  
  // Form state
  const [roomName, setRoomName] = useState('')
  const [timeControl, setTimeControl] = useState('10+0')
  const [increment, setIncrement] = useState(0)
  const [isPrivate, setIsPrivate] = useState(true)
  
  // Room created state
  const [isCreating, setIsCreating] = useState(false)
  const [roomCreated, setRoomCreated] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [waitingForPlayer, setWaitingForPlayer] = useState(false)

  const handleCreateRoom = async () => {
    setIsCreating(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const code = generateRoomCode()
    setRoomCode(code)
    setRoomCreated(true)
    setWaitingForPlayer(true)
    setIsCreating(false)
    
    // TODO: Real implementation
    // socket.emit('room:create', { roomName, timeControl, increment, isPrivate })
    // socket.on('room:created', (data) => { setRoomCode(data.code) })
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/rooms/join?code=${roomCode}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleStartGame = () => {
    // TODO: socket.emit('room:start', roomCode)
    navigate(`/rooms/${roomCode}`)
  }

  const handleCancel = () => {
    if (roomCreated) {
      // TODO: socket.emit('room:delete', roomCode)
    }
    navigate('/rooms')
  }

  // Waiting for player screen
  if (roomCreated && waitingForPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <Card padding="none" className="max-w-2xl w-full">
          <div className="p-8">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Phòng đã được tạo!
              </h1>
              <p className="text-gray-600">
                Chia sẻ mã phòng hoặc link để mời bạn bè tham gia
              </p>
            </div>

            {/* Room Code Display */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">Mã phòng của bạn</p>
                <div className="text-4xl font-bold tracking-widest text-blue-600 font-mono mb-4">
                  {roomCode}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleCopyCode}
                    className="bg-white"
                  >
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    {copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="bg-white"
                  >
                    {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                    {copiedLink ? 'Đã sao chép!' : 'Sao chép link'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Room Settings Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Cài đặt phòng</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tên phòng:</p>
                  <p className="font-medium text-gray-900">
                    {roomName || 'Không có tên'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Thời gian:</p>
                  <p className="font-medium text-gray-900">{timeControl}</p>
                </div>
                <div>
                  <p className="text-gray-600">Chế độ:</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    {isPrivate ? 'Riêng tư' : 'Công khai'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Increment:</p>
                  <p className="font-medium text-gray-900">
                    {increment > 0 ? `+${increment}s` : 'Không'}
                  </p>
                </div>
              </div>
            </div>

            {/* Waiting Status */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Đang chờ đối thủ tham gia...</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Bạn bè có thể tham gia bằng cách nhập mã phòng
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                fullWidth
              >
                Hủy phòng
              </Button>
              <Button
                variant="success"
                onClick={handleStartGame}
                fullWidth
              >
                <Play size={18} />
                Bắt đầu (Test)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Create room form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-3xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/rooms')}
            className="mb-4"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tạo phòng mới
          </h1>
          <p className="text-gray-600">
            Tùy chỉnh cài đặt phòng và mời bạn bè chơi cùng
          </p>
        </div>

        <Card padding="none">
          <div className="p-6 space-y-6">
            {/* Room Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Tên phòng (tùy chọn)
              </label>
              <Input
                placeholder="Ví dụ: Phòng của tôi, Trận đấu hữu nghị..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                fullWidth
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                Để trống nếu không muốn đặt tên
              </p>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Thời gian mỗi người
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TIME_CONTROLS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeControl(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      timeControl === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Clock
                      size={20}
                      className={`mx-auto mb-2 ${
                        timeControl === option.value ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Increment */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Thời gian thêm mỗi nước đi
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {INCREMENTS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setIncrement(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      increment === option.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Chế độ phòng
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isPrivate
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Lock
                    size={24}
                    className={`mx-auto mb-2 ${isPrivate ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                  <div className="font-semibold text-gray-900">Riêng tư</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Chỉ người có mã mới vào được
                  </div>
                </button>
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !isPrivate
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Globe
                    size={24}
                    className={`mx-auto mb-2 ${!isPrivate ? 'text-green-600' : 'text-gray-400'}`}
                  />
                  <div className="font-semibold text-gray-900">Công khai</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hiển thị trong danh sách phòng
                  </div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                fullWidth
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateRoom}
                loading={isCreating}
                fullWidth
                size="lg"
              >
                <Users size={18} />
                Tạo phòng
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card padding="none" className="bg-blue-50 border-blue-200">
            <div className="p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Lock size={18} />
                Phòng riêng tư
              </h3>
              <p className="text-sm text-blue-700">
                Chỉ người có mã phòng mới có thể tham gia. Phù hợp để chơi với bạn bè.
              </p>
            </div>
          </Card>
          <Card padding="none" className="bg-green-50 border-green-200">
            <div className="p-4">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Globe size={18} />
                Phòng công khai
              </h3>
              <p className="text-sm text-green-700">
                Phòng sẽ hiển thị trong danh sách. Ai cũng có thể tham gia chơi.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
