import { useState, useCallback, useMemo, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import PropTypes from 'prop-types'
const ChessBoard = ({
  gameState,
  onMove,
  playerColor = 'white',
  disabled = false,
  showMoveHints = true,
  showCoordinates = true,
  highlightCheck = true,
  soundEnabled = true,
  animationDuration = 300,
  customSquareStyles = {},
}) => {
  const [moveFrom, setMoveFrom] = useState('')
  const [optionSquares, setOptionSquares] = useState({})
  const [rightClickedSquares, setRightClickedSquares] = useState({})

  const safeMove = useCallback(
    (move) => {
      try {
        return gameState.move(move)
      } catch {
        return null
      }
    },
    [gameState]
  )

  // Note: chess.js instances mutate in place, so we read fen() directly (no useMemo)
  // to always get the latest position on each render.
  const position = gameState?.fen() || 'start'

  const playSound = useCallback(
    (_type) => {
      if (!soundEnabled) return
    },
    [soundEnabled]
  )

  const getMoveOptions = useCallback(
    (square) => {
      if (!gameState) return []

      const moves = gameState.moves({ square, verbose: true })
      if (moves.length === 0) {
        setOptionSquares({})
        return []
      }

      if (!showMoveHints) {
        setOptionSquares({})
        return moves
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

      newSquares[square] = {
        background: 'rgba(255, 255, 0, 0.4)',
      }

      setOptionSquares(newSquares)
      return moves
    },
    [gameState, showMoveHints]
  )

  const onSquareClick = useCallback(
    (square) => {
      if (disabled || !gameState) return

      setRightClickedSquares({})

      if (!moveFrom) {
        const hasMoveOptions = getMoveOptions(square)
        if (hasMoveOptions.length > 0) {
          setMoveFrom(square)
        }
        return
      }

      const moves = gameState.moves({ square: moveFrom, verbose: true })
      const foundMove = moves.find((m) => m.from === moveFrom && m.to === square)

      if (!foundMove) {
        const hasMoveOptions = getMoveOptions(square)
        setMoveFrom(hasMoveOptions.length > 0 ? square : '')
        return
      }

      const result = safeMove({
        from: moveFrom,
        to: square,
        promotion: 'q',
      })

      if (result) {
        playSound(result.captured ? 'capture' : 'move')
        onMove?.(result)
      }

      setMoveFrom('')
      setOptionSquares({})
    },
    [moveFrom, disabled, gameState, getMoveOptions, onMove, playSound, safeMove]
  )

  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      if (disabled || !gameState) return false

      const move = safeMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) return false

      playSound(move.captured ? 'capture' : 'move')
      onMove?.(move)

      setMoveFrom('')
      setOptionSquares({})
      return true
    },
    [disabled, gameState, onMove, playSound, safeMove]
  )

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

  const checkSquareStyles = useMemo(() => {
    if (!highlightCheck || !gameState) return {}

    if (gameState.inCheck()) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const square = gameState.board()[i][j]
          if (square && square.type === 'k' && square.color === gameState.turn()) {
            const file = String.fromCharCode(97 + j)
            const rank = 8 - i
            return {
              [`${file}${rank}`]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' },
            }
          }
        }
      }
    }
    return {}
  }, [gameState, highlightCheck])

  const squareStyles = useMemo(
    () => ({
      ...optionSquares,
      ...rightClickedSquares,
      ...checkSquareStyles,
      ...customSquareStyles,
    }),
    [optionSquares, rightClickedSquares, checkSquareStyles, customSquareStyles]
  )

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
  showMoveHints: PropTypes.bool,
  showCoordinates: PropTypes.bool,
  highlightCheck: PropTypes.bool,
  soundEnabled: PropTypes.bool,
  animationDuration: PropTypes.number,
  customSquareStyles: PropTypes.object,
}
export default ChessBoard
