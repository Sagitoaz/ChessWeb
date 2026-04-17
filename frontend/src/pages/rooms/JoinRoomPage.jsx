import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import { Card, Button, Input } from '@/components/common'
import gameService from '@/services/gameService'
import { Users, Clock, Lock, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react'

const shortenDisplayName = (value, max = 18) => {
  const text = String(value || '').trim()
  if (!text) return 'Unknown'
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

const normalizeRoomInfo = (room, code) => {
  const members = Array.isArray(room?.members) ? room.members : []
  const ownerMember = members.find((member) => member?.role === 'owner')
  const host =
    room?.host ||
    room?.owner ||
    (ownerMember
      ? {
          username: shortenDisplayName(
            ownerMember.username || ownerMember.displayName || ownerMember.userId || 'Unknown'
          ),
          avatar: ownerMember.avatarUrl || null,
        }
      : { username: 'Unknown', avatar: null })

  return {
    code: room?.code || code,
    name: room?.name || `Phòng ${code}`,
    host,
    settings: {
      timeControl: room?.settings?.timeControl || room?.timeControl || '10+0',
      increment: room?.settings?.increment || room?.increment || 0,
      isPrivate: room?.settings?.isPrivate ?? room?.isPrivate ?? true,
    },
    playerCount: room?.playerCount || room?.members?.length || room?.players?.length || 0,
    maxPlayers: room?.maxPlayers || 2,
    status: room?.status || 'waiting',
    activeGameId: room?.activeGameId || null,
    whitePlayerId: room?.whitePlayerId || null,
    blackPlayerId: room?.blackPlayerId || null,
  }
}

export default function JoinRoomPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showNotification } = useNotification()

  const [roomCode, setRoomCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)

  // Get code from URL query params if exists
  useEffect(() => {
    const validateFromUrl = async () => {
      const codeFromUrl = searchParams.get('code')
      if (!codeFromUrl) return

      const normalizedCode = codeFromUrl.toUpperCase()
      setRoomCode(normalizedCode)
      setIsValidating(true)
      setRoomInfo(null)

      try {
        const response = await gameService.getRoom(normalizedCode)
        const room = response?.data ?? response
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[room:join] validate from url', { code: normalizedCode, room })
        }
        setRoomInfo(normalizeRoomInfo(room, normalizedCode))
      } catch (err) {
        showNotification({
          type: 'error',
          title: 'Lỗi kiểm tra',
          message: err.message || 'Không thể kiểm tra mã phòng',
        })
      } finally {
        setIsValidating(false)
      }
    }

    validateFromUrl()
  }, [searchParams, showNotification])

  useEffect(() => {
    if (!roomInfo?.code) return

    const interval = setInterval(async () => {
      try {
        const response = await gameService.getRoom(roomInfo.code)
        const room = response?.data ?? response
        setRoomInfo(normalizeRoomInfo(room, roomInfo.code))
      } catch {
        // Keep previous room snapshot if transient fetch fails.
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [roomInfo?.code])

  const handleValidateRoom = async (code = roomCode) => {
    if (!code.trim()) {
      showNotification({
        type: 'error',
        title: 'Lỗi đầu vào',
        message: 'Vui lòng nhập mã phòng',
      })
      return
    }

    setIsValidating(true)
    setRoomInfo(null)

    try {
      const normalizedCode = code.toUpperCase()
      const response = await gameService.getRoom(normalizedCode)
      const room = response?.data ?? response
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[room:join] validate manual', { code: normalizedCode, room })
      }
      setRoomInfo(normalizeRoomInfo(room, normalizedCode))
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể kiểm tra mã phòng',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleJoinRoom = async () => {
    setIsJoining(true)
    try {
      const roomStarted = roomInfo?.status === 'playing' || Boolean(roomInfo?.activeGameId)
      if (!roomStarted) {
        await gameService.joinRoom(roomInfo.code)
      }

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[room:join] join requested', { code: roomInfo.code, started: roomStarted })
      }
      navigate(`/rooms/${roomInfo.code}`)
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Lỗi tham gia',
        message: err.message || 'Không thể tham gia phòng',
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleBack = () => {
    navigate('/rooms')
  }

  return (
    <div className="min-h-screen bg-[#e1edff] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Tham gia phòng</h1>
          <p className="text-lg text-gray-800">Nhập mã phòng để tham gia trận đấu với bạn bè</p>
        </div>

        <Card
          variant="elevated"
          padding="none"
          className="bg-white shadow-md border-none rounded-xl overflow-hidden"
        >
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-2">Nhập mã phòng</h2>
              <p className="text-gray-600">Mã phòng gồm 6 ký tự do chủ phòng cung cấp</p>
            </div>

            {/* Room Code Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Mã phòng</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="Nhập mã (VD: ABC123)"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase())
                      setRoomInfo(null)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && roomCode.trim()) {
                        handleValidateRoom()
                      }
                    }}
                    fullWidth
                    className="text-lg tracking-widest font-mono"
                    maxLength={6}
                    disabled={isValidating}
                  />
                  <Button
                    onClick={() => handleValidateRoom()}
                    disabled={!roomCode.trim() || isValidating}
                    loading={isValidating}
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    Kiểm tra
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mã phòng không phân biệt chữ hoa/thường
                </p>
              </div>

              {/* Room Info - Hiển thị khi validate thành công */}
              {roomInfo && (
                <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-green-900 text-lg">Phòng hợp lệ!</h3>
                      <p className="text-sm text-green-700">Bạn có thể tham gia phòng này</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Tên phòng</p>
                      <p className="font-semibold text-gray-900">
                        {roomInfo.name || `Phòng ${roomInfo.code}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 mb-1">Chủ phòng</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {roomInfo.host.username.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-gray-900 truncate">
                            {roomInfo.host.username}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Người chơi</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <Users size={14} />
                          {roomInfo.playerCount}/{roomInfo.maxPlayers}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Thời gian</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <Clock size={14} />
                          {roomInfo.settings.timeControl}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Chế độ</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          {roomInfo.settings.isPrivate ? (
                            <>
                              <Lock size={14} />
                              Riêng tư
                            </>
                          ) : (
                            <>
                              <Globe size={14} />
                              Công khai
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {roomInfo.settings.increment > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Increment</p>
                        <p className="font-medium text-gray-900">
                          +{roomInfo.settings.increment}s mỗi nước
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Join Button */}
                  <Button
                    onClick={handleJoinRoom}
                    loading={isJoining}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="mt-4 bg-green-600 hover:bg-green-700 py-3"
                  >
                    <Users size={18} />
                    {roomInfo.status === 'playing' ? 'Vào phòng đang chơi' : 'Tham gia phòng'}
                  </Button>
                </div>
              )}
            </div>

            {/* Help Section */}
            {!roomInfo && (
              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">💡 Hướng dẫn</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">1.</span>
                    Nhận mã phòng từ người tạo phòng
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">2.</span>
                    Nhập mã gồm 6 ký tự vào ô bên trên
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">3.</span>
                    Nhấn &quot;Kiểm tra&quot; để xác nhận phòng
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">4.</span>
                    Nhấn &quot;Tham gia phòng&quot; để vào chơi
                  </li>
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
