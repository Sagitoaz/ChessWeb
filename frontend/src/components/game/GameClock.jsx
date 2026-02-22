import { useState, useEffect, useRef } from 'prop-types'
import PropTypes from 'prop-types'
import { clsx } from 'clsx'
import { Clock } from 'lucide-react'

/**
 * GameClock Component
 * Đồng hồ đếm ngược với increment support
 */
const GameClock = ({
  initialTime = 600000, // 10 minutes
  increment = 0,
  isRunning = false,
  isMySide = false,
  onTimeOut,
  showMilliseconds = true,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const intervalRef = useRef(null)

  // Format time
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    if (ms < 10000 && showMilliseconds) {
      return `${seconds}.${String(milliseconds).padStart(2, '0')}`
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      const startTime = Date.now()
      const expectedEndTime = startTime + timeLeft

      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, expectedEndTime - now)

        setTimeLeft(remaining)

        if (remaining === 0) {
          clearInterval(intervalRef.current)
          onTimeOut?.()
        }
      }, 50) // Update every 50ms for smooth countdown
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, onTimeOut])

  // Reset when initialTime changes
  useEffect(() => {
    setTimeLeft(initialTime)
  }, [initialTime])

  // Determine urgency level
  const isUrgent = timeLeft < 30000 // < 30 seconds
  const isCritical = timeLeft < 10000 // < 10 seconds
  const isTimeout = timeLeft === 0

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200',
        {
          // Normal state
          'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800':
            !isRunning && !isTimeout,

          // Running state
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isRunning && !isUrgent,

          // Urgent state (< 30s)
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20':
            isRunning && isUrgent && !isCritical,

          // Critical state (< 10s) - pulsing
          'border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse': isRunning && isCritical,

          // Timeout
          'border-red-600 bg-red-100 dark:bg-red-900/40': isTimeout,

          // My side highlight
          'shadow-lg': isMySide && isRunning,
        }
      )}
    >
      <Clock
        className={clsx('w-5 h-5', {
          'text-gray-500': !isRunning && !isTimeout,
          'text-blue-500': isRunning && !isUrgent,
          'text-yellow-500': isRunning && isUrgent && !isCritical,
          'text-red-500': (isRunning && isCritical) || isTimeout,
        })}
      />

      <div className="flex-1">
        <div
          className={clsx('font-mono text-2xl font-bold tabular-nums', {
            'text-gray-700 dark:text-gray-300': !isRunning && !isTimeout,
            'text-blue-700 dark:text-blue-300': isRunning && !isUrgent,
            'text-yellow-700 dark:text-yellow-300': isRunning && isUrgent && !isCritical,
            'text-red-700 dark:text-red-300': (isRunning && isCritical) || isTimeout,
          })}
        >
          {formatTime(timeLeft)}
        </div>

        {increment > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            +{increment / 1000}s increment
          </div>
        )}
      </div>

      {isRunning && isMySide && (
        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">YOUR TURN</div>
      )}
    </div>
  )
}

GameClock.propTypes = {
  initialTime: PropTypes.number,
  increment: PropTypes.number,
  isRunning: PropTypes.bool,
  isMySide: PropTypes.bool,
  onTimeOut: PropTypes.func,
  showMilliseconds: PropTypes.bool,
}

export default GameClock
