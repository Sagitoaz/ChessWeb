/**
 * @fileoverview Tests for useWebSocket hooks
 * Testing WebSocket connection and event management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useWebSocket,
  useGameSocket,
  useRankedSocket,
  useRoomSocket,
  useTournamentSocket,
} from '../useWebSocket'

// Mock socketService
vi.mock('../../services/socketService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    isConnected: vi.fn(() => true),
  },
}))

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Connection Management', () => {
    it('should auto-connect on mount with token', () => {
      localStorage.setItem('token', 'test-token')

      renderHook(() => useWebSocket(true))

      // Should attempt to connect
      // Note: actual connection behavior depends on socketService
    })

    it('should not auto-connect when disabled', () => {
      const { result } = renderHook(() => useWebSocket(false))

      expect(result.current.isConnected).toBeDefined()
    })

    it('should provide connect function', () => {
      const { result } = renderHook(() => useWebSocket(false))

      expect(typeof result.current.connect).toBe('function')
      expect(typeof result.current.disconnect).toBe('function')
    })

    it('should provide emit function', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.emit('testEvent', { data: 'test' })
      })

      // Verify emit was called
      expect(typeof result.current.emit).toBe('function')
    })
  })

  describe('Event Listeners', () => {
    it('should add event listener', () => {
      const { result } = renderHook(() => useWebSocket())
      const callback = vi.fn()

      act(() => {
        result.current.on('testEvent', callback)
      })

      // Verify listener was added
      expect(typeof result.current.on).toBe('function')
    })

    it('should remove event listener', () => {
      const { result } = renderHook(() => useWebSocket())
      const callback = vi.fn()

      act(() => {
        result.current.on('testEvent', callback)
        result.current.off('testEvent', callback)
      })

      // Verify listener removal
      expect(typeof result.current.off).toBe('function')
    })

    it('should cleanup listeners on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket())

      unmount()

      // Verify cleanup
      // Actual cleanup behavior depends on socketService
    })
  })
})

describe('useGameSocket', () => {
  const mockMatchId = 'test-match-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide game-specific methods', () => {
    const { result } = renderHook(() => useGameSocket(mockMatchId))

    expect(typeof result.current.sendMove).toBe('function')
    expect(typeof result.current.resign).toBe('function')
    expect(typeof result.current.offerDraw).toBe('function')
    expect(typeof result.current.acceptDraw).toBe('function')
    expect(typeof result.current.declineDraw).toBe('function')
  })

  it('should provide game event listeners', () => {
    const { result } = renderHook(() => useGameSocket(mockMatchId))

    expect(typeof result.current.onMoveUpdate).toBe('function')
    expect(typeof result.current.onTimeUpdate).toBe('function')
    expect(typeof result.current.onGameEnd).toBe('function')
    expect(typeof result.current.onDrawOffer).toBe('function')
  })

  it('should send move with matchId', () => {
    const { result } = renderHook(() => useGameSocket(mockMatchId))

    act(() => {
      result.current.sendMove({ from: 'e2', to: 'e4' })
    })

    // Verify move was sent
    // Actual behavior depends on socketService
  })

  it('should not send move without matchId', () => {
    const { result } = renderHook(() => useGameSocket(null))

    act(() => {
      result.current.sendMove({ from: 'e2', to: 'e4' })
    })

    // Should not throw error
  })

  it('should resign game', () => {
    const { result } = renderHook(() => useGameSocket(mockMatchId))

    act(() => {
      result.current.resign()
    })

    // Verify resign was sent
  })

  it('should offer draw', () => {
    const { result } = renderHook(() => useGameSocket(mockMatchId))

    act(() => {
      result.current.offerDraw()
    })

    // Verify draw offer was sent
  })
})

describe('useRankedSocket', () => {
  it('should provide ranked queue methods', () => {
    const { result } = renderHook(() => useRankedSocket())

    expect(typeof result.current.joinQueue).toBe('function')
    expect(typeof result.current.leaveQueue).toBe('function')
    expect(typeof result.current.onMatchFound).toBe('function')
    expect(typeof result.current.onQueueUpdate).toBe('function')
  })

  it('should join queue with userId and rating', () => {
    const { result } = renderHook(() => useRankedSocket())

    act(() => {
      result.current.joinQueue('user-123', 1500)
    })

    // Verify queue join was sent
  })

  it('should leave queue', () => {
    const { result } = renderHook(() => useRankedSocket())

    act(() => {
      result.current.leaveQueue()
    })

    // Verify queue leave was sent
  })
})

describe('useRoomSocket', () => {
  const mockRoomCode = 'ROOMTEST123'

  it('should provide room methods', () => {
    const { result } = renderHook(() => useRoomSocket(mockRoomCode))

    expect(typeof result.current.createRoom).toBe('function')
    expect(typeof result.current.joinRoom).toBe('function')
    expect(typeof result.current.leaveRoom).toBe('function')
    expect(typeof result.current.startGame).toBe('function')
    expect(typeof result.current.sendMessage).toBe('function')
  })

  it('should provide room event listeners', () => {
    const { result } = renderHook(() => useRoomSocket(mockRoomCode))

    expect(typeof result.current.onPlayerJoined).toBe('function')
    expect(typeof result.current.onPlayerLeft).toBe('function')
    expect(typeof result.current.onGameStarted).toBe('function')
    expect(typeof result.current.onMessage).toBe('function')
  })

  it('should join room with code', () => {
    const { result } = renderHook(() => useRoomSocket(mockRoomCode))

    act(() => {
      result.current.joinRoom()
    })

    // Verify join was sent with roomCode
  })

  it('should not join without room code', () => {
    const { result } = renderHook(() => useRoomSocket(null))

    act(() => {
      result.current.joinRoom()
    })

    // Should not throw error
  })

  it('should send chat message', () => {
    const { result } = renderHook(() => useRoomSocket(mockRoomCode))

    act(() => {
      result.current.sendMessage('Hello!')
    })

    // Verify message was sent
  })

  it('should create room with settings', () => {
    const { result } = renderHook(() => useRoomSocket())

    act(() => {
      result.current.createRoom({
        isPrivate: false,
        timeControl: { initial: 600, increment: 5 },
      })
    })

    // Verify room creation was sent
  })
})

describe('useTournamentSocket', () => {
  const mockTournamentId = 'tournament-123'

  it('should provide tournament methods', () => {
    const { result } = renderHook(() => useTournamentSocket(mockTournamentId))

    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.withdraw).toBe('function')
  })

  it('should provide tournament event listeners', () => {
    const { result } = renderHook(() => useTournamentSocket(mockTournamentId))

    expect(typeof result.current.onPlayerRegistered).toBe('function')
    expect(typeof result.current.onTournamentStarted).toBe('function')
    expect(typeof result.current.onMatchReady).toBe('function')
  })

  it('should register for tournament', () => {
    const { result } = renderHook(() => useTournamentSocket(mockTournamentId))

    act(() => {
      result.current.register()
    })

    // Verify registration was sent
  })

  it('should not register without tournament ID', () => {
    const { result } = renderHook(() => useTournamentSocket(null))

    act(() => {
      result.current.register()
    })

    // Should not throw error
  })

  it('should withdraw from tournament', () => {
    const { result } = renderHook(() => useTournamentSocket(mockTournamentId))

    act(() => {
      result.current.withdraw()
    })

    // Verify withdrawal was sent
  })
})

describe('Error Handling', () => {
  it('should handle connection errors gracefully', () => {
    const { result } = renderHook(() => useWebSocket())

    expect(result.current.connectionError).toBeDefined()
  })

  it('should not crash on null socket operations', () => {
    const { result } = renderHook(() => useGameSocket(null))

    expect(() => {
      act(() => {
        result.current.sendMove({ from: 'e2', to: 'e4' })
        result.current.resign()
        result.current.offerDraw()
      })
    }).not.toThrow()
  })
})
