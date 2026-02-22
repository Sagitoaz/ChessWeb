import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { clsx } from 'clsx'

/**
 * MoveHistory Component
 * Hiển thị lịch sử nước đi với SAN notation
 */
const MoveHistory = ({
  moves = [],
  currentMoveIndex = -1,
  onMoveClick,
  highlightLastMove = true,
  scrollBehavior = 'smooth',
}) => {
  const historyRef = useRef(null)
  const currentMoveRef = useRef(null)

  const movePairs = []
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
      whiteIndex: i,
      blackIndex: i + 1,
    })
  }

  useEffect(() => {
    if (currentMoveRef.current && scrollBehavior !== 'none') {
      currentMoveRef.current.scrollIntoView({
        behavior: scrollBehavior,
        block: 'nearest',
      })
    }
  }, [currentMoveIndex, scrollBehavior])

  if (moves.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-sm">No moves yet</p>
      </div>
    )
  }

  return (
    <div
      ref={historyRef}
      className="h-full overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Move History</h3>
      </div>

      <div className="p-2 space-y-1">
        {movePairs.map((pair) => (
          <div
            key={pair.moveNumber}
            className="flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1"
          >
            <span className="text-gray-500 dark:text-gray-400 font-mono text-xs w-8">
              {pair.moveNumber}.
            </span>

            <button
              ref={currentMoveIndex === pair.whiteIndex ? currentMoveRef : null}
              onClick={() => onMoveClick?.(pair.whiteIndex)}
              className={clsx('flex-1 text-left font-mono px-2 py-1 rounded transition-colors', {
                'bg-blue-500 text-white': currentMoveIndex === pair.whiteIndex,
                'bg-yellow-100 dark:bg-yellow-900':
                  highlightLastMove &&
                  pair.whiteIndex === moves.length - 1 &&
                  currentMoveIndex !== pair.whiteIndex,
                'hover:bg-gray-100 dark:hover:bg-gray-600': currentMoveIndex !== pair.whiteIndex,
                'text-gray-900 dark:text-gray-100': currentMoveIndex !== pair.whiteIndex,
              })}
            >
              {pair.white?.san || ''}
            </button>

            {pair.black && (
              <button
                ref={currentMoveIndex === pair.blackIndex ? currentMoveRef : null}
                onClick={() => onMoveClick?.(pair.blackIndex)}
                className={clsx('flex-1 text-left font-mono px-2 py-1 rounded transition-colors', {
                  'bg-blue-500 text-white': currentMoveIndex === pair.blackIndex,
                  'bg-yellow-100 dark:bg-yellow-900':
                    highlightLastMove &&
                    pair.blackIndex === moves.length - 1 &&
                    currentMoveIndex !== pair.blackIndex,
                  'hover:bg-gray-100 dark:hover:bg-gray-600': currentMoveIndex !== pair.blackIndex,
                  'text-gray-900 dark:text-gray-100': currentMoveIndex !== pair.blackIndex,
                })}
              >
                {pair.black.san}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

MoveHistory.propTypes = {
  moves: PropTypes.arrayOf(
    PropTypes.shape({
      san: PropTypes.string.isRequired,
      from: PropTypes.string,
      to: PropTypes.string,
    })
  ),
  currentMoveIndex: PropTypes.number,
  onMoveClick: PropTypes.func,
  highlightLastMove: PropTypes.bool,
  scrollBehavior: PropTypes.oneOf(['auto', 'smooth', 'none']),
}

export default MoveHistory
