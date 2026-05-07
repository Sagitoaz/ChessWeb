/**
 * BotSelectPage - Trang chọn độ khó bot
 * Member 4 - Bot & Replay Module
 * Theme: Light mode (thống nhất)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { botGameAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { THEME, STATUS_COLORS } from '@/styles/theme'
import { Loader, Button } from '@components/common'
import { Bot, Zap, Brain, Skull } from 'lucide-react'

const BOT_LEVELS = [
  {
    level: 1,
    name: 'Dễ',
    icon: Bot,
    ratingRange: '600-900',
    description: 'Phù hợp người mới làm quen',
    bgLight: STATUS_COLORS.win.bg,
    textColor: STATUS_COLORS.win.text,
    borderColor: 'border-green-500',
  },
  {
    level: 2,
    name: 'Bình thường',
    icon: Zap,
    ratingRange: '1100-1400',
    description: 'Có phản đòn cơ bản, phù hợp luyện tập',
    bgLight: STATUS_COLORS.waiting.bg,
    textColor: STATUS_COLORS.waiting.text,
    borderColor: 'border-yellow-500',
  },
  {
    level: 3,
    name: 'Khó',
    icon: Brain,
    ratingRange: '1800-2200',
    description: 'Tính toán sâu và trừng phạt sai lầm rõ rệt',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-500',
  },
  {
    level: 4,
    name: 'Siêu cấp khó',
    icon: Skull,
    ratingRange: '3200+',
    description: 'Giới hạn cao nhất, chỉ để thử sức',
    bgLight: STATUS_COLORS.lose.bg,
    textColor: STATUS_COLORS.lose.text,
    borderColor: 'border-red-500',
  },
]

export default function BotSelectPage() {
  const navigate = useNavigate()
  const { error: showError } = useNotification()
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    if (!selectedLevel) return
    setIsStarting(true)
    try {
      const gameData = await botGameAPI.startBotGame(selectedLevel)
      try {
        sessionStorage.setItem(`bot-game-${gameData.gameId}`, JSON.stringify(gameData))
      } catch {
        // Ignore storage failures; navigation state still works.
      }
      navigate(`/bot/game/${gameData.gameId}`, {
        state: { gameData, sessionId: gameData.sessionId },
      })
    } catch (err) {
      const status = err?.statusCode ?? err?.status ?? err?.response?.status
      const backendMessage =
        (typeof err?.message === 'string' && err.message) ||
        (typeof err?.error?.message === 'string' && err.error.message) ||
        (Array.isArray(err?.message) ? err.message[0] : null)

      const msg =
        {
          401: 'Bạn cần đăng nhập để chơi với bot',
          422: 'Độ khó không hợp lệ',
          429: 'Quá nhiều yêu cầu, thử lại sau',
          503: 'Bot service tạm thời không khả dụng',
          504: 'Bot service timeout, thử lại',
        }[status] ??
        backendMessage ??
        'Không thể bắt đầu game'
      showError(msg)
      setIsStarting(false)
    }
  }

  return (
    <div className={`min-h-[100dvh] ${THEME.background.page} px-4 py-8 sm:py-12`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-5xl sm:text-6xl mb-4">🤖</div>
          <h1 className={`text-3xl sm:text-4xl font-bold ${THEME.text.primary} mb-3`}>
            Chơi Với Bot
          </h1>
          <p className={THEME.text.secondary}>GameMode: HumanVsBot — Không tính ELO</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {BOT_LEVELS.map((lvl) => {
            const isSelected = selectedLevel === lvl.level
            const Icon = lvl.icon
            return (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className={`${THEME.background.card} ${THEME.rounded.lg} border-2 p-4 sm:p-6 text-left transition-all ${THEME.shadow.sm} ${
                  isSelected
                    ? `${lvl.borderColor} ${lvl.bgLight}`
                    : `${THEME.border.DEFAULT} ${THEME.background.hover}`
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 ${lvl.bgLight} ${THEME.rounded.DEFAULT} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${lvl.textColor}`} />
                  </div>
                  {isSelected && (
                    <span
                      className={`${lvl.bgLight} ${lvl.textColor} px-2 py-1 ${THEME.rounded.DEFAULT} text-xs font-bold`}
                    >
                      ✓ Đã chọn
                    </span>
                  )}
                </div>
                <h3 className={`text-xl font-bold ${THEME.text.primary} mb-1`}>{lvl.name}</h3>
                <p className={`text-sm ${THEME.text.secondary} mb-3`}>{lvl.description}</p>
                <div className={`text-xs ${THEME.text.muted}`}>
                  <div>ELO: {lvl.ratingRange}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!selectedLevel || isStarting}
            className={`${THEME.primary.DEFAULT} ${THEME.primary.hover} font-bold px-12 py-4 ${THEME.rounded.lg}`}
          >
            {isStarting ? (
              <>
                <Loader size="sm" className="mr-2" />
                Đang khởi tạo...
              </>
            ) : (
              <>
                <Bot className="w-5 h-5 mr-2" />
                {selectedLevel ? `Bắt Đầu — ${BOT_LEVELS[selectedLevel - 1].name}` : 'Chọn Độ Khó'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
