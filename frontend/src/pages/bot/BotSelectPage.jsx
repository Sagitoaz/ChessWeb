import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { botGameAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { Loader } from '@components/common'

const BOT_LEVELS = [
  {
    level: 1,
    name: 'Easy',
    ratingRange: '500-800',
    depth: 1,
    timeLimitMs: 100,
    description: 'Phù hợp người mới bắt đầu',
    borderColor: 'border-green-400',
    textColor: 'text-green-400',
    bgSel: 'bg-green-950',
  },
  {
    level: 2,
    name: 'Medium',
    ratingRange: '900-1200',
    depth: 3,
    timeLimitMs: 1000,
    description: 'Thử thách vừa phải, tốt để luyện tập',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-400',
    bgSel: 'bg-yellow-950',
  },
  {
    level: 3,
    name: 'Hard',
    ratingRange: '1600-1900',
    depth: 10,
    timeLimitMs: 3000,
    description: 'Đòi hỏi chiến thuật để thắng',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-400',
    bgSel: 'bg-orange-950',
  },
  {
    level: 4,
    name: 'Expert',
    ratingRange: '2200+',
    depth: 20,
    timeLimitMs: 5000,
    description: 'Gần như không thể thắng',
    borderColor: 'border-red-400',
    textColor: 'text-red-400',
    bgSel: 'bg-red-950',
  },
]

export default function BotSelectPage() {
  const navigate = useNavigate()
  const { error: showError } = useNotification()
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [isStarting, setIsStarting] = useState(false)

  // S1_StartBotGame.puml: POST /games/bot { level }
  const handleStart = async () => {
    if (!selectedLevel) return
    setIsStarting(true)
    try {
      // 201: { gameId, sessionId, initialFEN, playerColor, config, botPlayer, humanPlayer, status:'Waiting' }
      const gameData = await botGameAPI.startBotGame(selectedLevel)
      // SM: Waiting → state starts; BotGamePage sẽ set InGame
      navigate(`/bot/game/${gameData.gameId}`, {
        state: { gameData, sessionId: gameData.sessionId },
      })
    } catch (err) {
      const msg =
        {
          401: 'Bạn cần đăng nhập để chơi với bot',
          422: 'Độ khó không hợp lệ',
          429: 'Quá nhiều yêu cầu, thử lại sau',
          503: 'Bot service tạm thời không khả dụng',
          504: 'Bot service timeout, thử lại',
        }[err.status] ?? 'Không thể bắt đầu game'
      showError(msg)
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">♟ Chơi Với Bot</h1>
          <p className="text-gray-400">GameMode: HumanVsBot — Không tính ELO</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {BOT_LEVELS.map((lvl) => {
            const isSelected = selectedLevel === lvl.level
            return (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? `${lvl.borderColor} ${lvl.bgSel}`
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div
                  className={`font-bold text-lg mb-1 ${isSelected ? lvl.textColor : 'text-white'}`}
                >
                  {lvl.name}
                  {isSelected && <span className="ml-2">✓</span>}
                </div>
                <p className="text-gray-400 text-sm mb-3">{lvl.description}</p>
                <div
                  className={`text-xs space-y-0.5 ${isSelected ? lvl.textColor : 'text-gray-500'}`}
                >
                  <div>Rating: ~{lvl.ratingRange}</div>
                  <div>
                    Depth: {lvl.depth} | Response: {lvl.timeLimitMs}ms
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleStart}
          disabled={!selectedLevel || isStarting}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedLevel && !isStarting
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size="sm" /> Đang chuẩn bị...
            </span>
          ) : selectedLevel ? (
            `Bắt Đầu — ${BOT_LEVELS[selectedLevel - 1].name}`
          ) : (
            'Chọn Độ Khó Trước'
          )}
        </button>

        <p className="text-center text-gray-600 text-xs mt-4">
          Kết quả được lưu vào Lịch Sử. Không ảnh hưởng đến rating.
        </p>
      </div>
    </div>
  )
}
