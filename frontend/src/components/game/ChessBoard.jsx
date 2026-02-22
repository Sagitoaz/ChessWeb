import { useState, useCallback, useMemo, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import PropTypes from 'prop-types'

/**
 * ChessBoard Component
 * Wrapper cho react-chessboard với chess.js integration
 */
const ChessBoard = ({
  gameState,
  onMove,
  playerColor = 'white',
  disabled = false,
  showCoordinates = true,
  highlightCheck = true,
  soundEnabled = true,
  animationDuration = 300,
  customSquareStyles = {},
}) => {
  const [moveFrom, setMoveFrom] = useState('')
  const [optionSquares, setOptionSquares] = useState({})
  const [rightClickedSquares, setRightClickedSquares] = useState({})

  // Get current position from gameState
  const position = useMemo(() => {
    return gameState?.fen() || 'start'
  }, [gameState])

  // Sound effect helper (bạn có thể tạo các sound files)
  const playSound = useCallback(
    (_type) => {
      if (!soundEnabled) return

      // TODO: Implement actual sound
      // const audio = new Audio(`/sounds/${_type}.mp3`)
      // audio.play()
    },
    [soundEnabled]
  )

  // Get legal moves for a square
  const getMoveOptions = useCallback(
    (square) => {
      if (!gameState) return []

      const moves = gameState.getMovesForSquare(square)
      if (moves.length === 0) {
        setOptionSquares({})
        return []
      }

      const newSquares = {}
      moves.forEach((move) => {
        newSquares[move.to] = {
          background:
            gameState.get(move.to) && gameState.get(move.to).color !== gameState.get(square).color
              ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
              : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
          borderRadius: '50%',
        }
      })

      // Highlight source square
      newSquares[square] = {
        background: 'rgba(255, 255, 0, 0.4)',
      }

      setOptionSquares(newSquares)
      return moves
    },
    [gameState]
  )

  // Handle square click
  const onSquareClick = useCallback(
    (square) => {
      if (disabled || !gameState) return

      // Reset right clicks
      setRightClickedSquares({})

      // If no piece selected yet
      if (!moveFrom) {
        const hasMoveOptions = getMoveOptions(square)
        if (hasMoveOptions.length > 0) {
          setMoveFrom(square)
        }
        return
      }

      // Try to make move
      const moves = gameState.getMovesForSquare(moveFrom)
      const foundMove = moves.find((m) => m.from === moveFrom && m.to === square)

      if (!foundMove) {
        // Click on another piece of same color
        const hasMoveOptions = getMoveOptions(square)
        setMoveFrom(hasMoveOptions.length > 0 ? square : '')
        return
      }

      // Make the move
      const result = gameState.move({
        from: moveFrom,
        to: square,
        promotion: 'q', // Auto-queen (có thể cải tiến sau)
      })

      if (result) {
        playSound(result.captured ? 'capture' : 'move')
        onMove?.(result)
      }

      // Reset state
      setMoveFrom('')
      setOptionSquares({})
    },
    [moveFrom, gameState, disabled, getMoveOptions, onMove, playSound]
  )

  // Handle piece drop (drag & drop)
  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      if (disabled || !gameState) return false

      const move = gameState.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      // Illegal move
      if (move === null) return false

      playSound(move.captured ? 'capture' : 'move')
      onMove?.(move)

      setMoveFrom('')
      setOptionSquares({})
      return true
    },
    [gameState, disabled, onMove, playSound]
  )

  // Handle right click (for analysis)
  const onSquareRightClick = useCallback((square) => {
    const color = 'rgba(0, 0, 255, 0.4)'
    setRightClickedSquares((prev) => ({
      ...prev,
      [square]:
        prev[square] && prev[square].backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    }))
  }, [])

  // Highlight check square
  const checkSquareStyles = useMemo(() => {
    if (!highlightCheck || !gameState) return {}

    if (gameState.inCheck()) {
      // Find king position
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const square = gameState.board()[i][j]
          if (square && square.type === 'k' && square.color === gameState.turn()) {
            const file = String.fromCharCode(97 + j) // a-h
            const rank = 8 - i // 1-8
            return {
              [`${file}${rank}`]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' },
            }
          }
        }
      }
    }
    return {}
  }, [gameState, highlightCheck])

  // Combine all square styles
  const squareStyles = useMemo(
    () => ({
      ...optionSquares,
      ...rightClickedSquares,
      ...checkSquareStyles,
      ...customSquareStyles,
    }),
    [optionSquares, rightClickedSquares, checkSquareStyles, customSquareStyles]
  )

  // Play check sound
  useEffect(() => {
    if (gameState?.inCheck()) {
      playSound('check')
    }
  }, [gameState, playSound])

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <Chessboard
        position={position}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        boardOrientation={playerColor}
        arePiecesDraggable={!disabled}
        customSquareStyles={squareStyles}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        animationDuration={animationDuration}
        showBoardNotation={showCoordinates}
      />
    </div>
  )
}

ChessBoard.propTypes = {
  gameState: PropTypes.object,
  onMove: PropTypes.func,
  playerColor: PropTypes.oneOf(['white', 'black']),
  disabled: PropTypes.bool,
  showCoordinates: PropTypes.bool,
  highlightCheck: PropTypes.bool,
  soundEnabled: PropTypes.bool,
  animationDuration: PropTypes.number,
  customSquareStyles: PropTypes.object,
}
export default ChessBoard
