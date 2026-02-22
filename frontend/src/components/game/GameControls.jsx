import { useState } from 'react'
import PropTypes from 'prop-types'
import { clsx } from 'clsx'
import { Flag, Handshake, Pause, Play, AlertTriangle } from 'lucide-react'

/**
 * GameControls Component
 * Resign, Draw, Pause/Resume buttons
 */
const GameControls = ({
  onResign,
  onOfferDraw,
  onPause,
  onResume,
  disabled = false,
  showPause = false,
  isPaused = false,
  drawOffered = false,
}) => {
  const [showResignConfirm, setShowResignConfirm] = useState(false)

  const handleResignClick = () => {
    if (!showResignConfirm) {
      setShowResignConfirm(true)
      setTimeout(() => setShowResignConfirm(false), 3000)
    } else {
      onResign?.()
      setShowResignConfirm(false)
    }
  }

  const handleDrawClick = () => {
    if (!drawOffered) {
      onOfferDraw?.()
    }
  }

  const handlePauseToggle = () => {
    if (isPaused) {
      onResume?.()
    } else {
      onPause?.()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleResignClick}
        disabled={disabled}
        className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all', {
          'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed': disabled,
          'bg-red-500 hover:bg-red-600 text-white': !disabled && !showResignConfirm,
          'bg-red-700 hover:bg-red-800 text-white animate-pulse': !disabled && showResignConfirm,
        })}
      >
        {showResignConfirm ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Confirm Resign?</span>
          </>
        ) : (
          <>
            <Flag className="w-4 h-4" />
            <span>Resign</span>
          </>
        )}
      </button>

      <button
        onClick={handleDrawClick}
        disabled={disabled || drawOffered}
        className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all', {
          'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed': disabled || drawOffered,
          'bg-blue-500 hover:bg-blue-600 text-white': !disabled && !drawOffered,
        })}
      >
        <Handshake className="w-4 h-4" />
        <span>{drawOffered ? 'Draw Offered' : 'Offer Draw'}</span>
      </button>

      {showPause && (
        <button
          onClick={handlePauseToggle}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            {
              'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed': disabled,
              'bg-yellow-500 hover:bg-yellow-600 text-white': !disabled,
            }
          )}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

GameControls.propTypes = {
  onResign: PropTypes.func,
  onOfferDraw: PropTypes.func,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
  disabled: PropTypes.bool,
  showPause: PropTypes.bool,
  isPaused: PropTypes.bool,
  drawOffered: PropTypes.bool,
}

export default GameControls
