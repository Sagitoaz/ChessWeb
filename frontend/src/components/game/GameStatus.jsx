import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { clsx } from 'clsx'
import { AlertCircle, Crown, Users, Clock } from 'lucide-react'

/**
 * GameStatus Component
 * Hiển thị trạng thái game và notifications
 */
const GameStatus = ({
  gameState,
  currentTurn,
  playerColor,
  status = { type: 'playing', message: '' },
  drawOffer = null,
  onAcceptDraw,
  onDeclineDraw,
}) => {
  const isMyTurn = useMemo(() => {
    return currentTurn === playerColor
  }, [currentTurn, playerColor])

  const statusInfo = useMemo(() => {
    if (!gameState) {
      return { icon: AlertCircle, color: 'gray', message: 'Loading...' }
    }

    switch (status.type) {
      case 'checkmate':
        return {
          icon: Crown,
          color: currentTurn === playerColor ? 'red' : 'green',
          message: currentTurn === playerColor ? 'Checkmate - You Lost!' : 'Checkmate - You Won!',
        }

      case 'check':
        return {
          icon: AlertCircle,
          color: 'red',
          message: isMyTurn ? 'You are in Check!' : 'Opponent is in Check',
        }

      case 'stalemate':
        return {
          icon: Users,
          color: 'yellow',
          message: 'Stalemate - Draw!',
        }

      case 'draw':
        return {
          icon: Users,
          color: 'blue',
          message: status.message || 'Game Drawn',
        }

      default:
        return {
          icon: Clock,
          color: isMyTurn ? 'blue' : 'gray',
          message: isMyTurn ? 'Your Turn' : "Opponent's Turn",
        }
    }
  }, [gameState, status, currentTurn, playerColor, isMyTurn])

  const Icon = statusInfo.icon

  return (
    <div className="space-y-3">
      <div
        className={clsx('flex items-center gap-3 px-4 py-3 rounded-lg border-2', {
          'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800':
            statusInfo.color === 'gray',
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20': statusInfo.color === 'blue',
          'border-red-500 bg-red-50 dark:bg-red-900/20': statusInfo.color === 'red',
          'border-green-500 bg-green-50 dark:bg-green-900/20': statusInfo.color === 'green',
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20': statusInfo.color === 'yellow',
        })}
      >
        <Icon
          className={clsx('w-6 h-6', {
            'text-gray-500': statusInfo.color === 'gray',
            'text-blue-500': statusInfo.color === 'blue',
            'text-red-500': statusInfo.color === 'red',
            'text-green-500': statusInfo.color === 'green',
            'text-yellow-500': statusInfo.color === 'yellow',
          })}
        />

        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{statusInfo.message}</p>

          {status.type === 'playing' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentTurn === 'white' ? 'White' : 'Black'} to move
            </p>
          )}
        </div>
      </div>

      {drawOffer && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />

            <div className="flex-1">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">Draw Offer</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {drawOffer.fromPlayer} offers a draw
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onAcceptDraw}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded transition-colors"
              >
                Accept
              </button>
              <button
                onClick={onDeclineDraw}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

GameStatus.propTypes = {
  gameState: PropTypes.object,
  currentTurn: PropTypes.oneOf(['white', 'black']),
  playerColor: PropTypes.oneOf(['white', 'black']),
  status: PropTypes.shape({
    type: PropTypes.oneOf(['playing', 'check', 'checkmate', 'stalemate', 'draw']).isRequired,
    message: PropTypes.string,
  }),
  drawOffer: PropTypes.shape({
    fromPlayer: PropTypes.string,
    timestamp: PropTypes.number,
  }),
  onAcceptDraw: PropTypes.func,
  onDeclineDraw: PropTypes.func,
}

export default GameStatus
