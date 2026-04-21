import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNotification } from '@/components/common/Notification'
import { Card, Button, Input } from '@/components/common'
import gameService from '@/services/gameService'
import { useAuthStore } from '@/store'
import { Users, Clock, Lock, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react'

const RECENT_ROOMS_KEY = 'chessweb_recent_rooms'

const saveRecentRoomCode = (code) => {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return

  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const list = Array.isArray(parsed) ? parsed : []
    const next = [normalized, ...list.filter((item) => String(item).toUpperCase() !== normalized)].slice(0, 8)
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures for recent-room helper.
  }
}

const shortenDisplayName = (value, max = 18) => {
  const text = String(value || '').trim()
  if (!text) return 'Unknown'
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid
    if (typeof value.id === 'string') return value.id
    if (typeof value._id === 'string') return value._id
  }
  return String(value)
}

const normalizeRoomInfo = (room, code) => {
  const members = Array.isArray(room?.members)
    ? room.members.map((member) => ({
        ...member,
        userId: normalizeId(member?.userId),
      }))
    : []
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
    members,
    settings: {
      timeControl: room?.settings?.timeControl || room?.timeControl || '10+0',
      increment: room?.settings?.increment || room?.increment || 0,
      isPrivate: room?.settings?.isPrivate ?? room?.isPrivate ?? true,
    },
    playerCount: Math.max(
      Number(room?.playerCount || 0),
      members.length,
      Number(room?.players?.length || 0)
    ),
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
  const user = useAuthStore((state) => state.user)
  const currentUserId = normalizeId(user?.id || user?.userId || user?._id || user?.sub)

  const [roomCode, setRoomCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)

  const alreadyJoined = Boolean(
    roomInfo?.members?.some((member) => normalizeId(member?.userId) === currentUserId)
  )
  const roomStarted = roomInfo?.status === 'playing' || Boolean(roomInfo?.activeGameId)
  const roomFull = Number(roomInfo?.playerCount || 0) >= Number(roomInfo?.maxPlayers || 2)
  const canJoinRoom = Boolean(roomInfo) && (!roomStarted || alreadyJoined) && (!roomFull || alreadyJoined)

  const roomStatusText = !roomInfo
    ? ''
    : alreadyJoined
      ? 'Bạn đã tham gia phòng này.'
      : roomStarted
        ? 'Trận đang diễn ra, chỉ người đã tham gia mới vào lại được.'
        : roomFull
          ? 'Phòng đã đủ người chơi.'
          : 'Bạn có thể tham gia phòng này.'

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
      saveRecentRoomCode(normalizedCode)
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
    if (!roomInfo) return
    if (!canJoinRoom) {
      showNotification({
        type: 'warning',
        title: 'Không thể tham gia',
        message: roomStatusText || 'Phòng không khả dụng để tham gia.',
      })
      return
    }

    setIsJoining(true)
    try {
      if (!alreadyJoined && !roomStarted) {
        await gameService.joinRoom(roomInfo.code)
      }
      saveRecentRoomCode(roomInfo.code)

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[room:join] join requested', {
          code: roomInfo.code,
          started: roomStarted,
          alreadyJoined,
          roomFull,
        })
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
                      <p className="text-sm text-green-700">{roomStatusText}</p>
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
                    disabled={!canJoinRoom || isJoining}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className={`mt-4 py-3 ${
                      canJoinRoom
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Users size={18} />
                    {alreadyJoined
                      ? roomStarted
                        ? 'Bạn đã tham gia - Vào lại'
                        : 'Bạn đã tham gia - Vào phòng'
                      : roomFull
                        ? 'Phòng đã đầy'
                        : roomStarted
                          ? 'Không thể vào phòng đang chơi'
                          : 'Tham gia phòng'}
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
