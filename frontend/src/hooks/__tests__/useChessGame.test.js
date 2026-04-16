/**
 * @fileoverview Tests for useChessGame hook
 * Testing chess game logic and state management
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessGame, useOnlineChessGame } from '../useChessGame'

describe('useChessGame', () => {
  describe('Initialization', () => {
    it('should initialize with starting position', () => {
      const { result } = renderHook(() => useChessGame())

      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(result.current.currentTurn).toBe('w')
      expect(result.current.history).toEqual([])
      expect(result.current.gameStatus.isGameOver).toBe(false)
    })

    it('should initialize with custom FEN', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      const { result } = renderHook(() => useChessGame({ initialFen: customFen }))

      expect(result.current.fen).toBe(customFen)
      expect(result.current.currentTurn).toBe('b')
    })
  })

  describe('Making Moves', () => {
    it('should make a valid move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const moveResult = result.current.makeMove({ from: 'e2', to: 'e4' })
        expect(moveResult).toBeTruthy()
      })

      expect(result.current.currentTurn).toBe('b')
      expect(result.current.history.length).toBe(1)
    })

    it('should reject invalid move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const moveResult = result.current.makeMove({ from: 'e2', to: 'e5' })
        expect(moveResult).toBeNull()
      })

      expect(result.current.currentTurn).toBe('w')
      expect(result.current.history.length).toBe(0)
    })

    it('should call onMove callback', () => {
      const onMove = vi.fn()
      const { result } = renderHook(() => useChessGame({ onMove }))

      act(() => {
        result.current.makeMove({ from: 'e2', to: 'e4' })
      })

      expect(onMove).toHaveBeenCalledTimes(1)
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'e2',
          to: 'e4',
        })
      )
    })

    it('should use movePiece shorthand', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.movePiece('e2', 'e4')
      })

      expect(result.current.currentTurn).toBe('b')
    })
  })

  describe('Undo Move', () => {
    it('should undo last move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove({ from: 'e2', to: 'e4' })
      })

      expect(result.current.currentTurn).toBe('b')

      act(() => {
        const undone = result.current.undoMove()
        expect(undone).toBe(true)
      })

      expect(result.current.currentTurn).toBe('w')
      expect(result.current.history.length).toBe(0)
    })

    it('should not undo when no moves', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const undone = result.current.undoMove()
        expect(undone).toBe(false)
      })
    })
  })

  describe('Reset Game', () => {
    it('should reset to starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove({ from: 'e2', to: 'e4' })
        result.current.resetGame()
      })

      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(result.current.currentTurn).toBe('w')
      expect(result.current.history.length).toBe(0)
    })

    it('should reset to custom FEN', () => {
      const { result } = renderHook(() => useChessGame())
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

      act(() => {
        result.current.resetGame(customFen)
      })

      expect(result.current.fen).toBe(customFen)
      expect(result.current.currentTurn).toBe('b')
    })
  })

  describe('Load FEN', () => {
    it('should load valid FEN', () => {
      const { result } = renderHook(() => useChessGame())
      const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

      act(() => {
        const loaded = result.current.loadFen(newFen)
        expect(loaded).toBe(true)
      })

      expect(result.current.fen).toBe(newFen)
    })

    it('should reject invalid FEN', () => {
      const { result } = renderHook(() => useChessGame())
      const invalidFen = 'invalid-fen-string'

      act(() => {
        const loaded = result.current.loadFen(invalidFen)
        expect(loaded).toBe(false)
      })
    })
  })

  describe('Square Selection', () => {
    it('should select square and show valid moves', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
      })

      expect(result.current.selectedSquare).toBe('e2')
      expect(result.current.validMoves.length).toBeGreaterThan(0)
      expect(result.current.validMoves).toContain('e4')
      expect(result.current.validMoves).toContain('e3')
    })

    it('should deselect when clicking same square', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
        result.current.selectSquare(null)
      })

      expect(result.current.selectedSquare).toBeNull()
      expect(result.current.validMoves.length).toBe(0)
    })
  })

  describe('Square Click Handler', () => {
    it('should select piece on first click', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e2')
      })

      expect(result.current.selectedSquare).toBe('e2')
    })

    it('should make move on second click', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e2')
        result.current.onSquareClick('e4')
      })

      expect(result.current.selectedSquare).toBeNull()
      expect(result.current.currentTurn).toBe('b')
    })

    it('should not select opponent pieces', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e7') // Black pawn when white's turn
      })

      expect(result.current.selectedSquare).toBeNull()
    })
  })

  describe('Game Status', () => {
    it('should detect checkmate', () => {
      const { result } = renderHook(() => useChessGame())

      // Fool's Mate
      act(() => {
        result.current.makeMove({ from: 'f2', to: 'f3' })
        result.current.makeMove({ from: 'e7', to: 'e5' })
        result.current.makeMove({ from: 'g2', to: 'g4' })
        result.current.makeMove({ from: 'd8', to: 'h4' })
      })

      expect(result.current.gameStatus.isCheckmate).toBe(true)
      expect(result.current.gameStatus.isGameOver).toBe(true)
    })

    it('should call onGameEnd on checkmate', () => {
      const onGameEnd = vi.fn()
      const { result } = renderHook(() => useChessGame({ onGameEnd }))

      // Fool's Mate
      act(() => {
        result.current.makeMove({ from: 'f2', to: 'f3' })
        result.current.makeMove({ from: 'e7', to: 'e5' })
        result.current.makeMove({ from: 'g2', to: 'g4' })
        result.current.makeMove({ from: 'd8', to: 'h4' })
      })

      expect(onGameEnd).toHaveBeenCalledTimes(1)
      expect(onGameEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'black',
        })
      )
    })
  })

  describe('Utilities', () => {
    it('should get piece at square', () => {
      const { result } = renderHook(() => useChessGame())

      const piece = result.current.getPieceAt('e2')
      expect(piece).toBeTruthy()
      expect(piece.type).toBe('p')
      expect(piece.color).toBe('w')
    })

    it('should get legal moves', () => {
      const { result } = renderHook(() => useChessGame())

      const moves = result.current.getLegalMoves()
      expect(moves.length).toBe(20) // 20 possible moves at start
    })

    it('should get PGN', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove({ from: 'e2', to: 'e4' })
      })

      const pgn = result.current.getPgn()
      expect(pgn).toContain('e4')
    })

    it('should get move count', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove({ from: 'e2', to: 'e4' })
        result.current.makeMove({ from: 'e7', to: 'e5' })
      })

      expect(result.current.getMoveCount()).toBe(2)
    })

    it('should get game result', () => {
      const { result } = renderHook(() => useChessGame())

      expect(result.current.getGameResult()).toBe('*')

      // Fool's Mate
      act(() => {
        result.current.makeMove({ from: 'f2', to: 'f3' })
        result.current.makeMove({ from: 'e7', to: 'e5' })
        result.current.makeMove({ from: 'g2', to: 'g4' })
        result.current.makeMove({ from: 'd8', to: 'h4' })
      })

      expect(result.current.getGameResult()).toBe('0-1')
    })
  })
})

describe('useOnlineChessGame', () => {
  it('should initialize with player color', () => {
    const mockGameSocket = {
      sendMove: vi.fn(),
      onMoveUpdate: vi.fn(),
      off: vi.fn(),
    }

    const { result } = renderHook(() =>
      useOnlineChessGame({
        matchId: 'test-123',
        playerColor: 'w',
        gameSocket: mockGameSocket,
      })
    )

    expect(result.current.playerColor).toBe('w')
    expect(result.current.isMyTurn).toBe(true)
  })

  it('should only allow moves on player turn', () => {
    const mockGameSocket = {
      sendMove: vi.fn(),
      onMoveUpdate: vi.fn(),
      off: vi.fn(),
    }

    const { result } = renderHook(() =>
      useOnlineChessGame({
        matchId: 'test-123',
        playerColor: 'w',
        gameSocket: mockGameSocket,
      })
    )

    // Should work on white's turn
    act(() => {
      result.current.onSquareClick('e2')
    })
    expect(result.current.selectedSquare).toBe('e2')

    // Make move
    act(() => {
      result.current.onSquareClick('e4')
    })

    // Now it's black's turn, white cannot select
    act(() => {
      result.current.onSquareClick('d2')
    })
    expect(result.current.selectedSquare).toBeNull()
  })

  it('should send moves via socket', () => {
    const mockGameSocket = {
      sendMove: vi.fn(),
      onMoveUpdate: vi.fn(),
      off: vi.fn(),
    }

    const { result } = renderHook(() =>
      useOnlineChessGame({
        matchId: 'test-123',
        playerColor: 'w',
        gameSocket: mockGameSocket,
      })
    )

    act(() => {
      result.current.makeMove({ from: 'e2', to: 'e4' })
    })

    expect(mockGameSocket.sendMove).toHaveBeenCalledTimes(1)
  })
})
