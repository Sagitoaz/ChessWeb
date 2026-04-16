import { Chess } from 'chess.js'

/**
 * Wrapper class for chess.js with additional utilities
 * Provides a cleaner API for chess operations in React components
 */
export class ChessGame {
  constructor(fen) {
    // Only pass fen if it's provided, otherwise start with default position
    this.game = fen ? new Chess(fen) : new Chess()
  }

  // Get current FEN
  fen() {
    return this.game.fen()
  }

  // Get PGN
  pgn() {
    return this.game.pgn()
  }

  // Load FEN
  load(fen) {
    return this.game.load(fen)
  }

  // Make a move
  move(move) {
    try {
      return this.game.move(move)
    } catch (error) {
      console.error('Invalid move:', error)
      return null
    }
  }

  // Undo last move
  undo() {
    return this.game.undo()
  }

  // Get all legal moves
  moves(options = {}) {
    return this.game.moves(options)
  }

  // Get legal moves for a specific square
  getMovesForSquare(square) {
    return this.game.moves({ square, verbose: true })
  }

  // Check if in check
  inCheck() {
    return this.game.inCheck()
  }

  // Check if in checkmate
  inCheckmate() {
    return this.game.isCheckmate()
  }

  // Alias for inCheckmate
  isCheckmate() {
    return this.game.isCheckmate()
  }

  // Check if in stalemate
  inStalemate() {
    return this.game.isStalemate()
  }

  // Alias for inStalemate
  isStalemate() {
    return this.game.isStalemate()
  }

  // Check if in draw
  inDraw() {
    return this.game.isDraw()
  }

  // Alias for inDraw
  isDraw() {
    return this.game.isDraw()
  }

  // Check if game is over
  isGameOver() {
    return this.game.isGameOver()
  }

  // Get current turn
  turn() {
    return this.game.turn() // 'w' or 'b'
  }

  // Get game history
  history(options = {}) {
    return this.game.history(options)
  }

  // Get piece at square
  get(square) {
    return this.game.get(square)
  }

  // Get board as 2D array
  board() {
    return this.game.board()
  }

  // Reset game
  reset() {
    this.game.reset()
  }

  // Get game result
  getResult() {
    if (this.inCheckmate()) {
      return this.turn() === 'w' ? 'black_win' : 'white_win'
    }
    if (this.inStalemate() || this.inDraw()) {
      return 'draw'
    }
    return 'ongoing'
  }

  // Get result reason
  getResultReason() {
    if (this.inCheckmate()) return 'checkmate'
    if (this.inStalemate()) return 'stalemate'
    if (this.game.isThreefoldRepetition()) return 'threefold_repetition'
    if (this.game.isInsufficientMaterial()) return 'insufficient_material'
    return null
  }

  // Validate move without making it
  isValidMove(from, to, promotion = null) {
    const moves = this.moves({ verbose: true })
    return moves.some((m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion))
  }

  // Get material count
  getMaterial() {
    const pieces = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    }

    const board = this.board()
    board.forEach((row) => {
      row.forEach((square) => {
        if (square) {
          pieces[square.color][square.type]++
        }
      })
    })

    return pieces
  }

  // Calculate material advantage
  getMaterialAdvantage() {
    const material = this.getMaterial()
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

    let whiteValue = 0
    let blackValue = 0

    Object.keys(values).forEach((piece) => {
      whiteValue += material.w[piece] * values[piece]
      blackValue += material.b[piece] * values[piece]
    })

    return whiteValue - blackValue
  }

  // Get move in SAN notation
  getSAN(move) {
    const tempGame = new Chess(this.fen())
    const result = tempGame.move(move)
    return result ? result.san : null
  }

  // Clone game
  clone() {
    return new ChessGame(this.fen())
  }

  // Load from PGN
  loadPGN(pgn) {
    return this.game.loadPgn(pgn)
  }
}

/**
 * Get opening name from ECO code (simplified)
 */
export const getOpeningName = (moves) => {
  // This is a simplified version. In production, use a full ECO database
  const openings = {
    'e4 e5': 'Open Game',
    'e4 c5': 'Sicilian Defense',
    'd4 d5': "Queen's Pawn Game",
    'd4 Nf6': 'Indian Defense',
    'Nf3 Nf6': 'Reti Opening',
    'c4': 'English Opening',
  }

  const firstMoves = moves.slice(0, 2).join(' ')
  return openings[firstMoves] || 'Unknown Opening'
}

/**
 * Format time in MM:SS
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Convert move object to UCI notation
 */
export const toUCI = (move) => {
  if (typeof move === 'string') return move
  return `${move.from}${move.to}${move.promotion || ''}`
}

/**
 * Parse UCI move to object
 */
export const fromUCI = (uci) => {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  }
}

/**
 * Get square color
 */
export const getSquareColor = (square) => {
  const file = square.charCodeAt(0) - 97 // a=0, b=1, ...
  const rank = parseInt(square[1])
  return (file + rank) % 2 === 0 ? 'dark' : 'light'
}

/**
 * Check if square is in check
 */
export const isSquareInCheck = (game, square) => {
  const piece = game.get(square)
  if (!piece || piece.type !== 'k') return false
  return game.inCheck()
}

export default ChessGame
