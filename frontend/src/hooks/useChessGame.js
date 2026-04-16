import { useState, useCallback, useEffect, useRef } from 'react'
import { ChessGame } from '../utils/chessLogic'

/**
 * Custom hook for managing chess game state and logic
 * Provides a clean interface for chess operations in React components
 *
 * @param {Object} options - Configuration options
 * @param {string} options.initialFen - Initial FEN position
 * @param {Function} options.onMove - Callback when a move is made
 * @param {Function} options.onGameEnd - Callback when game ends
 * @returns {Object} Chess game state and actions
 */
export function useChessGame(options = {}) {
  const { initialFen, onMove, onGameEnd } = options

  // Initialize chess game
  const gameRef = useRef(null)
  if (!gameRef.current) {
    gameRef.current = new ChessGame(initialFen)
  }

  // Game state
  const [fen, setFen] = useState(() => gameRef.current.fen())
  const [history, setHistory] = useState(() => gameRef.current.history({ verbose: true }))
  const [currentTurn, setCurrentTurn] = useState(() => gameRef.current.turn())
  const [gameStatus, setGameStatus] = useState({
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    isGameOver: false,
  })
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [lastMove, setLastMove] = useState(null)

  // Update game status
  const updateGameStatus = useCallback(() => {
    const status = {
      isCheck: gameRef.current.inCheck(),
      isCheckmate: gameRef.current.isCheckmate(),
      isStalemate: gameRef.current.isStalemate(),
      isDraw: gameRef.current.isDraw(),
      isGameOver: gameRef.current.isGameOver(),
    }
    setGameStatus(status)

    // Call onGameEnd if game is over
    if (status.isGameOver && onGameEnd) {
      let result = 'draw'
      if (status.isCheckmate) {
        result = currentTurn === 'w' ? 'black' : 'white'
      }
      onGameEnd({ status, result })
    }

    return status
  }, [currentTurn, onGameEnd])

  // Make a move
  const makeMove = useCallback(
    (move) => {
      try {
        const result = gameRef.current.move(move)

        if (result) {
          // Update all state
          setFen(gameRef.current.fen())
          setHistory(gameRef.current.history({ verbose: true }))
          setCurrentTurn(gameRef.current.turn())
          setLastMove({ from: result.from, to: result.to })
          setSelectedSquare(null)
          setValidMoves([])

          // Update game status
          updateGameStatus()

          // Call onMove callback
          if (onMove) {
            onMove(result)
          }

          return result
        }

        return null
      } catch (error) {
        console.error('Invalid move:', error)
        return null
      }
    },
    [onMove, updateGameStatus]
  )

  // Make a move from coordinates
  const movePiece = useCallback(
    (from, to, promotion = 'q') => {
      const move = {
        from,
        to,
        promotion,
      }
      return makeMove(move)
    },
    [makeMove]
  )

  // Undo last move
  const undoMove = useCallback(() => {
    const undone = gameRef.current.undo()
    if (undone) {
      setFen(gameRef.current.fen())
      setHistory(gameRef.current.history({ verbose: true }))
      setCurrentTurn(gameRef.current.turn())
      setLastMove(null)
      updateGameStatus()
      return true
    }
    return false
  }, [updateGameStatus])

  // Reset game
  const resetGame = useCallback(
    (newFen) => {
      if (newFen) {
        gameRef.current.load(newFen)
      } else {
        gameRef.current = new ChessGame()
      }

      setFen(gameRef.current.fen())
      setHistory([])
      setCurrentTurn(gameRef.current.turn())
      setSelectedSquare(null)
      setValidMoves([])
      setLastMove(null)
      updateGameStatus()
    },
    [updateGameStatus]
  )

  // Load position from FEN
  const loadFen = useCallback(
    (newFen) => {
      try {
        const loaded = gameRef.current.load(newFen)
        if (loaded) {
          setFen(newFen)
          setHistory(gameRef.current.history({ verbose: true }))
          setCurrentTurn(gameRef.current.turn())
          setSelectedSquare(null)
          setValidMoves([])
          setLastMove(null)
          updateGameStatus()
          return true
        }
        return false
      } catch (error) {
        console.error('Invalid FEN:', error)
        return false
      }
    },
    [updateGameStatus]
  )

  // Load moves from PGN
  const loadPgn = useCallback(
    (pgn) => {
      try {
        const loaded = gameRef.current.loadPGN(pgn)
        if (loaded) {
          setFen(gameRef.current.fen())
          setHistory(gameRef.current.history({ verbose: true }))
          setCurrentTurn(gameRef.current.turn())
          updateGameStatus()
          return true
        }
        return false
      } catch (error) {
        console.error('Invalid PGN:', error)
        return false
      }
    },
    [updateGameStatus]
  )

  // Select a square
  const selectSquare = useCallback((square) => {
    setSelectedSquare(square)

    if (square) {
      // Get valid moves for this square
      const moves = gameRef.current.getMovesForSquare(square)
      setValidMoves(moves.map((m) => m.to))
    } else {
      setValidMoves([])
    }
  }, [])

  // Handle square click
  const onSquareClick = useCallback(
    (square) => {
      // If no square selected, select this one
      if (!selectedSquare) {
        const piece = gameRef.current.get(square)
        // Only select if there's a piece and it's the current player's turn
        if (piece && piece.color === currentTurn) {
          selectSquare(square)
        }
        return
      }

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        selectSquare(null)
        return
      }

      // If clicking a valid move destination, make the move
      if (validMoves.includes(square)) {
        // Check if it's a pawn promotion
        const piece = gameRef.current.get(selectedSquare)
        const isPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'))

        if (isPromotion) {
          // For now, auto-promote to queen. In a real app, show a dialog
          movePiece(selectedSquare, square, 'q')
        } else {
          movePiece(selectedSquare, square)
        }
        return
      }

      // If clicking another piece of the same color, select it instead
      const piece = gameRef.current.get(square)
      if (piece && piece.color === currentTurn) {
        selectSquare(square)
      } else {
        selectSquare(null)
      }
    },
    [selectedSquare, validMoves, currentTurn, selectSquare, movePiece]
  )

  // Get piece at square
  const getPieceAt = useCallback((square) => {
    return gameRef.current.get(square)
  }, [])

  // Get all legal moves
  const getLegalMoves = useCallback(() => {
    return gameRef.current.moves({ verbose: true })
  }, [])

  // Get PGN
  const getPgn = useCallback(() => {
    return gameRef.current.pgn()
  }, [])

  // Get move count
  const getMoveCount = useCallback(() => {
    return Math.floor(history.length / 2) + 1
  }, [history])

  // Check if square is under attack
  const isSquareUnderAttack = useCallback((square, attackingColor) => {
    return gameRef.current.isAttacked(square, attackingColor)
  }, [])

  // Get game result
  const getGameResult = useCallback(() => {
    if (gameStatus.isCheckmate) {
      return currentTurn === 'w' ? '0-1' : '1-0'
    }
    if (gameStatus.isDraw || gameStatus.isStalemate) {
      return '1/2-1/2'
    }
    return '*' // Game in progress
  }, [gameStatus, currentTurn])

  // Initialize game status on mount
  useEffect(() => {
    updateGameStatus()
  }, [updateGameStatus])

  return {
    // State
    fen,
    history,
    currentTurn,
    gameStatus,
    selectedSquare,
    validMoves,
    lastMove,

    // Actions
    makeMove,
    movePiece,
    undoMove,
    resetGame,
    loadFen,
    loadPgn,
    selectSquare,
    onSquareClick,

    // Utilities
    getPieceAt,
    getLegalMoves,
    getPgn,
    getMoveCount,
    isSquareUnderAttack,
    getGameResult,

    // Direct access to game instance if needed
    game: gameRef.current,
  }
}

/**
 * Hook for managing chess game with online opponent
 * Integrates with WebSocket for real-time moves
 *
 * @param {Object} options - Configuration options
 * @param {string} options.matchId - Match ID
 * @param {string} options.playerColor - Player's color ('w' or 'b')
 * @param {Object} options.gameSocket - Game socket from useGameSocket
 * @returns {Object} Chess game state and actions
 */
export function useOnlineChessGame(options = {}) {
  const { matchId, playerColor, gameSocket } = options
  const [opponentMove, setOpponentMove] = useState(null)

  // Use base chess game hook
  const chessGame = useChessGame({
    initialFen: options.initialFen,
    onMove: (move) => {
      // Send move to server only if it was our turn (before the move)
      // After making a move, turn switches, so we check if gameSocket exists
      if (gameSocket) {
        gameSocket.sendMove(move)
      }
      options.onMove?.(move)
    },
    onGameEnd: options.onGameEnd,
  })

  const makeLocalMove = chessGame.makeMove
  const currentTurn = chessGame.currentTurn
  const baseOnSquareClick = chessGame.onSquareClick

  // Listen for opponent moves
  useEffect(() => {
    if (!gameSocket || !matchId) return

    const handleMoveUpdate = (data) => {
      if (data.matchId === matchId) {
        setOpponentMove(data.move)
        // Make the move on our local board
        makeLocalMove(data.move)
      }
    }

    gameSocket.onMoveUpdate(handleMoveUpdate)

    return () => {
      // Cleanup listener
      if (gameSocket.off) {
        gameSocket.off('game:moveUpdate', handleMoveUpdate)
      }
    }
  }, [gameSocket, matchId, makeLocalMove])

  // Override onSquareClick to only allow moves on player's turn
  const onSquareClick = useCallback(
    (square) => {
      // Only allow moves if it's player's turn
      if (currentTurn === playerColor) {
        baseOnSquareClick(square)
      }
    },
    [baseOnSquareClick, currentTurn, playerColor]
  )

  return {
    ...chessGame,
    onSquareClick,
    opponentMove,
    isMyTurn: chessGame.currentTurn === playerColor,
    playerColor,
  }
}

export default useChessGame
