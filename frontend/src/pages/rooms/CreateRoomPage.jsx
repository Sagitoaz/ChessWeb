import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/common'
import gameService from '@/services/gameService'
import { useAuthStore } from '@store'
import { Users, Clock, Lock, Globe, Copy, Check, Share2, ArrowLeft, Play } from 'lucide-react'

// Time control options
const TIME_CONTROLS = [
  { value: 'blitz', label: '5 min', description: 'Blitz', initialTimeSeconds: 300 },
  { value: 'rapid', label: '10 min', description: 'Rapid', initialTimeSeconds: 600 },
  { value: 'classical', label: '15+10', description: 'Standard', initialTimeSeconds: 900 },
]

const INCREMENTS = [
  { value: 0, label: 'Không' },
  { value: 5, label: '+5 giây' },
  { value: 10, label: '+10 giây' },
  { value: 15, label: '+15 giây' },
]

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  // Form state
  const [roomName, setRoomName] = useState('')
  const [timeControl, setTimeControl] = useState('rapid')
  const [increment, setIncrement] = useState(0)
  const [isPrivate, setIsPrivate] = useState(true)

  // Room created state
  const [isCreating, setIsCreating] = useState(false)
  const [roomCreated, setRoomCreated] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [waitingForPlayer, setWaitingForPlayer] = useState(false)
  const [error, setError] = useState('')

  const selectedControl =
    TIME_CONTROLS.find((option) => option.value === timeControl) || TIME_CONTROLS[1]

  const withTimeout = async (promise, timeoutMs = 8000) => {
    let timeoutId
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Yeu cau tao phong bi treo qua lau')),
            timeoutMs
          )
        }),
      ])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  const handleCreateRoom = async () => {
    setIsCreating(true)
    setError('')

    if (!user || !token) {
      setError('Phien dang nhap khong hop le. Vui long dang nhap lai.')
      setIsCreating(false)
      navigate('/login')
      return
    }

    try {
      const response = await withTimeout(
        gameService.createRoom({
          name: roomName.trim() || undefined,
          timeControl,
          isPrivate,
          initialTimeSeconds: selectedControl.initialTimeSeconds,
        })
      )
      const room = response?.data?.data ?? response?.data ?? response
      const createdCode = room?.code || room?.roomCode || room?.data?.code
      if (!createdCode) {
        throw new Error('Không nhận được mã phòng từ máy chủ')
      }
      setRoomCode(createdCode)
      setRoomCreated(true)
      setWaitingForPlayer(true)
    } catch (createError) {
      const message =
        createError?.response?.data?.message || createError?.message || 'Không thể tạo phòng'
      setError(message)
    } finally {
      setIsCreating(false)
    }
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
    if (!roomCode) return

    gameService
      .startRoomGame(roomCode)
      .then((response) => {
        const data = response?.data ?? response
        navigate(`/rooms/${roomCode}`, { state: { activeGameId: data?.gameId || null } })
      })
      .catch(() => {
        navigate(`/rooms/${roomCode}`)
      })
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
      <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
        <Card
          variant="elevated"
          padding="none"
          className="max-w-2xl w-full bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-8">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-blue-400 mb-2">Phòng đã được tạo!</h1>
              <p className="text-gray-600">Chia sẻ mã phòng để mời bạn bè tham gia</p>
            </div>

            {/* Room Code Display */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-700 mb-2 font-medium">Mã phòng của bạn</p>
                <div className="text-4xl font-bold tracking-widest text-blue-600 font-mono mb-4">
                  {roomCode}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleCopyCode}>
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    {copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}
                  </Button>
                  <Button variant="outline" onClick={handleCopyLink}>
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
                  <p className="font-semibold text-gray-900">{roomName || 'Không có tên'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Thời gian:</p>
                  <p className="font-semibold text-gray-900">{timeControl}</p>
                </div>
                <div>
                  <p className="text-gray-600">Chế độ:</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    {isPrivate ? 'Riêng tư' : 'Công khai'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Increment:</p>
                  <p className="font-semibold text-gray-900">
                    {increment > 0 ? `+${increment}s` : 'Không'}
                  </p>
                </div>
              </div>
            </div>

            {/* Waiting Status */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg border border-yellow-200">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Đang chờ đối thủ tham gia...</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Bạn bè có thể tham gia bằng cách nhập mã phòng
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} fullWidth>
                Hủy phòng
              </Button>
              <Button
                variant="primary"
                onClick={handleStartGame}
                fullWidth
                className="bg-blue-600 hover:bg-blue-700"
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
    <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/rooms')} className="mb-4">
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Tạo phòng mới</h1>
          <p className="text-lg text-gray-800">Tùy chỉnh cài đặt phòng và mời bạn bè chơi cùng</p>
        </div>

        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-blue-400 mb-1">Cài đặt phòng</h2>
              <p className="text-gray-600">Chọn thời gian và chế độ chơi cho phòng</p>
            </div>

            {/* Room Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tên phòng (tùy chọn)
              </label>
              <Input
                placeholder="Ví dụ: Phòng của tôi, Trận đấu hữu nghị..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                fullWidth
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">Để trống nếu không muốn đặt tên</p>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
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
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Thời gian thêm mỗi nước đi
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {INCREMENTS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setIncrement(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      increment === option.value
                        ? 'border-blue-500 bg-blue-50'
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
              <label className="block text-sm font-semibold text-gray-900 mb-3">Chế độ phòng</label>
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
                  <div className="text-xs text-gray-600 mt-1">Chỉ người có mã mới vào được</div>
                </button>
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !isPrivate
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Globe
                    size={24}
                    className={`mx-auto mb-2 ${!isPrivate ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                  <div className="font-semibold text-gray-900">Công khai</div>
                  <div className="text-xs text-gray-600 mt-1">Hiển thị trong danh sách</div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-100">
              <Button variant="outline" onClick={handleCancel} fullWidth>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateRoom}
                loading={isCreating}
                fullWidth
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 py-3"
              >
                <Users size={18} />
                Tạo phòng
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
