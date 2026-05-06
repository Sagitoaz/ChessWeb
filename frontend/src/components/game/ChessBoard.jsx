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
  const [pendingPromotion, setPendingPromotion] = useState(null)

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

  const getPromotionMove = useCallback(
    (from, to) => {
      if (!gameState) return null
      const moves = gameState.moves({ square: from, verbose: true })
      return moves.find((move) => move.from === from && move.to === to && move.promotion)
    },
    [gameState]
  )

  const completeMove = useCallback(
    ({ from, to, promotion }) => {
      const result = safeMove({
        from,
        to,
        ...(promotion ? { promotion } : {}),
      })

      if (!result) return false

      playSound(result.captured ? 'capture' : 'move')
      onMove?.(result)
      setMoveFrom('')
      setOptionSquares({})
      setPendingPromotion(null)
      return true
    },
    [onMove, playSound, safeMove]
  )

  const startPromotionChoice = useCallback(
    (from, to) => {
      const promotionMove = getPromotionMove(from, to)
      if (!promotionMove) return false

      setPendingPromotion({
        from,
        to,
        color: promotionMove.color,
      })
      setMoveFrom('')
      setOptionSquares({})
      return true
    },
    [getPromotionMove]
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

      if (startPromotionChoice(moveFrom, square)) return
      completeMove({ from: moveFrom, to: square })
    },
    [moveFrom, completeMove, disabled, gameState, getMoveOptions, startPromotionChoice]
  )

  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      if (disabled || !gameState) return false

      if (startPromotionChoice(sourceSquare, targetSquare)) return false
      return completeMove({ from: sourceSquare, to: targetSquare })
    },
    [completeMove, disabled, gameState, startPromotionChoice]
  )

  const selectPromotionPiece = useCallback(
    (promotion) => {
      if (!pendingPromotion) return
      completeMove({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion,
      })
    },
    [completeMove, pendingPromotion]
  )

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
  }, [])

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

  const promotionOptions = useMemo(
    () => [
      { value: 'q', label: 'Hậu', white: '♕', black: '♛' },
      { value: 'r', label: 'Xe', white: '♖', black: '♜' },
      { value: 'b', label: 'Tượng', white: '♗', black: '♝' },
      { value: 'n', label: 'Mã', white: '♘', black: '♞' },
    ],
    []
  )

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
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
      {pendingPromotion && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px] rounded-lg">
          <div className="w-[min(92%,360px)] rounded-2xl bg-white shadow-2xl border border-slate-200 p-4">
            <div className="text-center mb-3">
              <h3 className="text-base font-bold text-slate-900">Chọn quân phong cấp</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tốt tới hàng cuối, chọn quân bạn muốn đổi thành.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {promotionOptions.map((piece) => (
                <button
                  key={piece.value}
                  type="button"
                  onClick={() => selectPromotionPiece(piece.value)}
                  className="group rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition p-3 flex flex-col items-center gap-1"
                >
                  <span className="text-3xl leading-none text-slate-900 group-hover:text-blue-700">
                    {pendingPromotion.color === 'b' ? piece.black : piece.white}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{piece.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={cancelPromotion}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
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
