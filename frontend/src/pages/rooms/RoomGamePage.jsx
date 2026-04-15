import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, Modal } from '@/components/common'
import gameService from '@/services/gameService'
import { useAuthStore } from '@/store'
import {
  MessageCircle,
  RotateCcw,
  Flag,
  Handshake,
  Copy,
  ArrowLeft,
  Trophy,
  Send,
} from 'lucide-react'

const buildFallbackRoom = (roomId, user) => ({
  code: roomId || 'ROOM',
  name: `Phòng ${roomId || 'ROOM'}`,
  host: {
    id: user?.id || 'host',
    username: user?.username || 'Bạn',
    avatar: user?.avatarUrl || null,
  },
  guest: {
    id: 'guest',
    username: 'Đang chờ người chơi',
    avatar: null,
  },
  settings: {
    timeControl: '10+0',
    increment: 0,
    isPrivate: true,
  },
})

const normalizeRoomData = (room, roomId, user) => {
  const fallback = buildFallbackRoom(roomId, user)
  const players = Array.isArray(room?.players) ? room.players : []
  return {
    code: room?.code || fallback.code,
    name: room?.name || fallback.name,
    host: room?.host || room?.owner || players[0] || fallback.host,
    guest: room?.guest || players[1] || fallback.guest,
    settings: {
      timeControl:
        room?.settings?.timeControl || room?.timeControl || fallback.settings.timeControl,
      increment: room?.settings?.increment || room?.increment || 0,
      isPrivate: room?.settings?.isPrivate ?? room?.isPrivate ?? true,
    },
  }
}

export default function RoomGamePage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  // Game state
  const [roomData, setRoomData] = useState(() => buildFallbackRoom(roomId, user))
  const [currentPlayer] = useState('white') // Mock: assume we're white
  const [isMyTurn] = useState(true)
  const [timeWhite, setTimeWhite] = useState(600) // 10 phút = 600 giây
  const [timeBlack, setTimeBlack] = useState(600)
  const [moveHistory] = useState(['e4', 'e5', 'Nf3', 'Nc6'])
  const [gameStatus, setGameStatus] = useState('playing') // playing, ended

  // Chat state
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { user: 'ChessMaster99', message: 'Chúc bạn chơi vui vẻ!', timestamp: new Date() },
    { user: 'Player1', message: 'Cảm ơn, chúc may mắn!', timestamp: new Date() },
  ])

  // Modal states
  const [showResignModal, setShowResignModal] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [showRematchModal, setShowRematchModal] = useState(false)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [systemNotice, setSystemNotice] = useState('')

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) return
      try {
        const response = await gameService.getRoom(roomId)
        const room = response?.data ?? response
        setRoomData(normalizeRoomData(room, roomId, user))
      } catch (_error) {
        setRoomData(buildFallbackRoom(roomId, user))
      }
    }

    loadRoom()
  }, [roomId, user])

  // Timer countdown
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const interval = setInterval(() => {
      if (isMyTurn) {
        setTimeWhite((prev) => Math.max(0, prev - 1))
      } else {
        setTimeBlack((prev) => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isMyTurn, gameStatus])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return

    setChatMessages([
      ...chatMessages,
      {
        user: currentPlayer === 'white' ? roomData.host.username : roomData.guest.username,
        message: chatMessage,
        timestamp: new Date(),
      },
    ])
    setChatMessage('')
  }

  const handleResign = () => {
    setShowResignModal(false)
    setGameResult({
      winner: currentPlayer === 'white' ? 'black' : 'white',
      reason: 'resignation',
    })
    setGameStatus('ended')
    setShowEndGameModal(true)
    setSystemNotice('Bạn đã đầu hàng. Trận đấu đã kết thúc.')
  }

  const handleOfferDraw = () => {
    // TODO: Send draw offer to opponent via socket
    setShowDrawModal(false)
    setSystemNotice('Đã gửi đề nghị hòa đến đối thủ.')
  }

  const handleRematch = () => {
    // TODO: Real implementation
    // socket.emit('room:offerRematch', { roomId })
    setShowRematchModal(false)
    setSystemNotice('Đã gửi lời mời chơi lại.')
  }

  const handleLeaveRoom = () => {
    navigate('/rooms')
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomData.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const UserAvatar = ({ username, color }) => {
    const initial = username?.charAt(0).toUpperCase() || '?'
    const bgColor = color === 'white' ? 'bg-blue-500' : 'bg-purple-500'

    return (
      <div
        className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-white font-semibold`}
      >
        {initial}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#e1edff] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleLeaveRoom} size="sm">
            <ArrowLeft size={18} />
            Rời phòng
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Mã phòng: </span>
              <span className="font-mono font-bold text-blue-600">{roomData.code}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode}>
              {copiedCode ? <Copy size={16} className="text-green-600" /> : <Copy size={16} />}
            </Button>
          </div>
        </div>

        {systemNotice && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            {systemNotice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Chess Board */}
          <div className="lg:col-span-2 space-y-4">
            {/* Opponent Info */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar username={roomData.guest.username} color="black" />
                  <div>
                    <p className="font-semibold text-gray-900">{roomData.guest.username}</p>
                    <p className="text-xs text-gray-600">Đối thủ</p>
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold font-mono px-4 py-2 rounded-lg ${
                    !isMyTurn ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {formatTime(timeBlack)}
                </div>
              </div>
            </Card>

            {/* Chess Board Placeholder */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">♟️</div>
                  <p className="text-gray-600 font-semibold mb-2">Bàn cờ sẽ hiển thị ở đây</p>
                  <p className="text-sm text-gray-500">ChessBoard component sẽ được tích hợp sau</p>
                  <div className="mt-4 text-xs text-gray-400">
                    (Sử dụng react-chessboard + chess.js)
                  </div>
                </div>
              </div>
            </Card>

            {/* Current Player Info */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar username={roomData.host.username} color="white" />
                  <div>
                    <p className="font-semibold text-gray-900">{roomData.host.username}</p>
                    <p className="text-xs text-gray-600">Bạn (Chủ phòng)</p>
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold font-mono px-4 py-2 rounded-lg ${
                    isMyTurn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {formatTime(timeWhite)}
                </div>
              </div>
            </Card>

            {/* Game Controls */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowResignModal(true)}
                    disabled={gameStatus !== 'playing'}
                  >
                    <Flag size={16} />
                    Đầu hàng
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDrawModal(true)}
                    disabled={gameStatus !== 'playing'}
                  >
                    <Handshake size={16} />
                    Đề nghị hòa
                  </Button>
                  {gameStatus === 'ended' && (
                    <Button
                      variant="primary"
                      onClick={() => setShowRematchModal(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw size={16} />
                      Chơi lại
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Info & Chat */}
          <div className="space-y-4">
            {/* Move History */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-blue-400 flex items-center gap-2">
                  <Trophy size={18} />
                  Lịch sử nước đi
                </h3>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                <div className="space-y-1 text-sm">
                  {moveHistory.map((move, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index % 2 === 0 && (
                        <span className="text-gray-500 w-8">{Math.floor(index / 2) + 1}.</span>
                      )}
                      <span
                        className={`font-mono ${index === moveHistory.length - 1 ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                      >
                        {move}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Chat */}
            <Card
              variant="elevated"
              padding="none"
              className="bg-white shadow-md border-none rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-blue-400 flex items-center gap-2">
                  <MessageCircle size={18} />
                  Trò chuyện
                </h3>
              </div>

              {/* Messages */}
              <div className="p-4 h-64 overflow-y-auto space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-semibold text-gray-900 mb-1">{msg.user}</p>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-2">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage()
                      }
                    }}
                    fullWidth
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Resign Modal */}
      <Modal
        isOpen={showResignModal}
        onClose={() => setShowResignModal(false)}
        title="Xác nhận đầu hàng"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Bạn có chắc chắn muốn đầu hàng? Ván đấu sẽ kết thúc ngay lập tức.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowResignModal(false)} fullWidth>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleResign} fullWidth>
              Đầu hàng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Draw Offer Modal */}
      <Modal isOpen={showDrawModal} onClose={() => setShowDrawModal(false)} title="Đề nghị hòa">
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Gửi đề nghị hòa đến đối thủ? Đối thủ có thể chấp nhận hoặc từ chối.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDrawModal(false)} fullWidth>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleOfferDraw}
              fullWidth
              className="bg-blue-600 hover:bg-blue-700"
            >
              Gửi đề nghị
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rematch Modal */}
      <Modal isOpen={showRematchModal} onClose={() => setShowRematchModal(false)} title="Chơi lại">
        <div className="p-6">
          <p className="text-gray-700 mb-6">Gửi lời mời chơi lại đến đối thủ?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRematchModal(false)} fullWidth>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleRematch}
              fullWidth
              className="bg-green-600 hover:bg-green-700"
            >
              Gửi lời mời
            </Button>
          </div>
        </div>
      </Modal>

      {/* End Game Modal */}
      <Modal
        isOpen={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        title="Kết thúc ván đấu"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {gameResult?.winner === currentPlayer ? 'Bạn thắng!' : 'Bạn thua!'}
          </h3>
          <p className="text-gray-600 mb-6">
            Lý do: {gameResult?.reason === 'resignation' ? 'Đầu hàng' : 'Hết giờ'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleLeaveRoom} fullWidth>
              Rời phòng
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowEndGameModal(false)
                setShowRematchModal(true)
              }}
              fullWidth
              className="bg-blue-600 hover:bg-blue-700"
            >
              Chơi lại
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
