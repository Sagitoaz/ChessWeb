import { useEffect, useRef, useCallback, useState } from 'react'
import socketService from '../services/socketService'

/**
 * Custom React hook for WebSocket connection management
 * Provides a clean interface for components to interact with WebSocket
 *
 * @param {boolean} autoConnect - Whether to auto-connect on mount
 * @returns {Object} WebSocket utilities and state
 */
export function useWebSocket(autoConnect = true) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const listenersRef = useRef(new Map())

  // Connect to WebSocket
  const connect = useCallback((token) => {
    try {
      socketService.connect(token)
      setConnectionError(null)
    } catch (error) {
      setConnectionError(error.message)
      setIsConnected(false)
    }
  }, [])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    socketService.disconnect()
    setIsConnected(false)
  }, [])

  // Subscribe to an event
  const on = useCallback((event, callback) => {
    socketService.on(event, callback)

    // Track listener for cleanup
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, [])
    }
    listenersRef.current.get(event).push(callback)
  }, [])

  // Unsubscribe from an event
  const off = useCallback((event, callback) => {
    socketService.off(event, callback)

    // Remove from tracked listeners
    if (listenersRef.current.has(event)) {
      const callbacks = listenersRef.current.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }, [])

  // Emit an event
  const emit = useCallback((event, data) => {
    socketService.emit(event, data)
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      const token = localStorage.getItem('token')
      if (token) {
        connect(token)
      }
    }

    // Setup connection event listeners
    const handleConnect = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleError = (error) => {
      setConnectionError(error.message || 'Connection error')
      setIsConnected(false)
    }

    socketService.on('connect', handleConnect)
    socketService.on('disconnect', handleDisconnect)
    socketService.on('connect_error', handleError)

    const trackedListeners = listenersRef.current

    // Cleanup on unmount
    return () => {
      socketService.off('connect', handleConnect)
      socketService.off('disconnect', handleDisconnect)
      socketService.off('connect_error', handleError)

      // Clean up all tracked listeners
      trackedListeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          socketService.off(event, callback)
        })
      })
      trackedListeners.clear()

      if (autoConnect) {
        disconnect()
      }
    }
  }, [autoConnect, connect, disconnect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    on,
    off,
    emit,
    socketService, // Expose service for direct access if needed
  }
}

/**
 * Hook for game-specific WebSocket events
 * @param {string} matchId - Current match ID
 */
export function useGameSocket(matchId) {
  const { isConnected, on, off, emit } = useWebSocket()

  useEffect(() => {
    if (!matchId || !isConnected) return
    emit('game:join', { matchId })
  }, [matchId, isConnected, emit])

  // Send move
  const sendMove = useCallback(
    (move) => {
      if (!matchId) return
      emit('game:move', { matchId, move })
    },
    [matchId, emit]
  )

  const joinGame = useCallback(() => {
    if (!matchId) return
    emit('game:join', { matchId })
  }, [matchId, emit])

  // Resign game
  const resign = useCallback(() => {
    if (!matchId) return
    emit('game:resign', { matchId })
  }, [matchId, emit])

  // Offer draw
  const offerDraw = useCallback(() => {
    if (!matchId) return
    emit('game:offerDraw', { matchId })
  }, [matchId, emit])

  // Accept draw
  const acceptDraw = useCallback(() => {
    if (!matchId) return
    emit('game:acceptDraw', { matchId })
  }, [matchId, emit])

  // Decline draw
  const declineDraw = useCallback(() => {
    if (!matchId) return
    emit('game:declineDraw', { matchId })
  }, [matchId, emit])

  // Subscribe to game events
  const onMoveUpdate = useCallback((callback) => on('game:moveUpdate', callback), [on])
  const onTimeUpdate = useCallback((callback) => on('game:timeUpdate', callback), [on])
  const onGameEnd = useCallback((callback) => on('game:end', callback), [on])
  const onDrawOffer = useCallback((callback) => on('game:drawOffer', callback), [on])
  const onOpponentDisconnected = useCallback(
    (callback) => on('game:opponentDisconnected', callback),
    [on]
  )
  const onOpponentReconnected = useCallback(
    (callback) => on('game:opponentReconnected', callback),
    [on]
  )

  return {
    isConnected,
    joinGame,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    onMoveUpdate,
    onTimeUpdate,
    onGameEnd,
    onDrawOffer,
    onOpponentDisconnected,
    onOpponentReconnected,
    off,
  }
}

/**
 * Hook for ranked queue WebSocket events
 */
export function useRankedSocket() {
  const { isConnected, on, emit } = useWebSocket()

  // Join ranked queue
  const joinQueue = useCallback(
    (options = {}) => {
      emit('ranked:joinQueue', options)
    },
    [emit]
  )

  // Leave ranked queue
  const leaveQueue = useCallback(() => {
    emit('ranked:leaveQueue')
  }, [emit])

  // Subscribe to ranked events
  const onMatchFound = useCallback((callback) => on('ranked:matchFound', callback), [on])
  const onQueueUpdate = useCallback((callback) => on('ranked:queueUpdate', callback), [on])

  return {
    isConnected,
    joinQueue,
    leaveQueue,
    onMatchFound,
    onQueueUpdate,
  }
}

/**
 * Hook for room WebSocket events
 * @param {string} roomCode - Current room code
 */
export function useRoomSocket(roomCode) {
  const { isConnected, on, emit } = useWebSocket()

  // Create room
  const createRoom = useCallback(
    (settings) => {
      emit('room:create', settings)
    },
    [emit]
  )

  // Join room
  const joinRoom = useCallback(
    (code = roomCode) => {
      if (!code) return
      emit('room:join', { code })
    },
    [roomCode, emit]
  )

  // Leave room
  const leaveRoom = useCallback(
    (code = roomCode) => {
      if (!code) return
      emit('room:leave', { code })
    },
    [roomCode, emit]
  )

  // Start game
  const startGame = useCallback(
    (code = roomCode) => {
      if (!code) return
      emit('room:startGame', { code })
    },
    [roomCode, emit]
  )

  // Send chat message
  const sendMessage = useCallback(
    (message) => {
      if (!roomCode) return
      emit('room:message', { code: roomCode, message })
    },
    [roomCode, emit]
  )

  // Subscribe to room events
  const onPlayerJoined = useCallback((callback) => on('room:playerJoined', callback), [on])
  const onPlayerLeft = useCallback((callback) => on('room:playerLeft', callback), [on])
  const onPlayerReady = useCallback((callback) => on('room:playerReady', callback), [on])
  const onGameStarted = useCallback((callback) => on('room:gameStarted', callback), [on])
  const onMessage = useCallback((callback) => on('room:message', callback), [on])
  const onRoomUpdate = useCallback((callback) => on('room:update', callback), [on])

  return {
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    sendMessage,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerReady,
    onGameStarted,
    onMessage,
    onRoomUpdate,
  }
}

/**
 * Hook for tournament WebSocket events
 * @param {string} tournamentId - Current tournament ID
 */
export function useTournamentSocket(tournamentId) {
  const { isConnected, on, emit } = useWebSocket()

  // Register for tournament
  const register = useCallback(() => {
    if (!tournamentId) return
    emit('tournament:register', { tournamentId })
  }, [tournamentId, emit])

  // Withdraw from tournament
  const withdraw = useCallback(() => {
    if (!tournamentId) return
    emit('tournament:withdraw', { tournamentId })
  }, [tournamentId, emit])

  // Subscribe to tournament events
  const onPlayerRegistered = useCallback(
    (callback) => on('tournament:playerRegistered', callback),
    [on]
  )
  const onPlayerWithdrawn = useCallback(
    (callback) => on('tournament:playerWithdrawn', callback),
    [on]
  )
  const onTournamentStarted = useCallback((callback) => on('tournament:started', callback), [on])
  const onRoundUpdate = useCallback((callback) => on('tournament:roundUpdate', callback), [on])
  const onMatchReady = useCallback((callback) => on('tournament:matchReady', callback), [on])
  const onTournamentCompleted = useCallback(
    (callback) => on('tournament:completed', callback),
    [on]
  )
  const onTournamentUpdate = useCallback((callback) => on('tournament:update', callback), [on])

  return {
    isConnected,
    register,
    withdraw,
    onPlayerRegistered,
    onPlayerWithdrawn,
    onTournamentStarted,
    onRoundUpdate,
    onMatchReady,
    onTournamentCompleted,
    onTournamentUpdate,
  }
}

export default useWebSocket
