import { io } from 'socket.io-client'
import { SOCKET_URL } from '../utils/constants'

/**
 * WebSocket Service using Socket.io
 * Manages real-time connections for the app
 */

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.authToken = null
  }

  connect(token) {
    const nextToken = token || localStorage.getItem('token')

    if (!nextToken) {
      console.warn('No auth token found for socket connection')
      return
    }

    const tokenChanged = Boolean(this.authToken && this.authToken !== nextToken)

    if (this.socket?.connected && !tokenChanged) {
      // eslint-disable-next-line no-console
      console.log('Socket already connected with current token')
      return this.socket
    }

    if (this.socket && tokenChanged) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }

    this.authToken = nextToken

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: {
        token: nextToken,
      },
      transports: ['websocket'],
      upgrade: false,
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    })

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('✅ Socket connected:', this.socket.id)
      }
    })

    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('❌ Socket disconnected:', reason)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
      this.authToken = null
      // eslint-disable-next-line no-console
      console.log('Socket disconnected manually')
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.')
      return
    }

    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    this.socket.on(event, callback)
  }

  off(event, callback) {
    if (!this.socket) return

    this.socket.off(event, callback)

    // Remove from listeners map
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ Socket not connected. Cannot emit event:', event)
      return
    }

    this.socket.emit(event, data)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`📤 Emitted ${event}:`, data)
    }
  }

  // Convenience methods for common events

  // Ranked match
  joinRankedQueue(options = {}) {
    this.emit('ranked:joinQueue', options)
  }

  leaveRankedQueue() {
    this.emit('ranked:leaveQueue')
  }

  onMatchFound(callback) {
    this.on('ranked:matchFound', callback)
  }

  // Game events
  sendMove(matchId, move) {
    this.emit('game:move', { matchId, move })
  }

  onMoveUpdate(callback) {
    this.on('game:moveUpdate', callback)
  }

  onTimeUpdate(callback) {
    this.on('game:timeUpdate', callback)
  }

  onGameEnd(callback) {
    this.on('game:end', callback)
  }

  resignGame(matchId) {
    this.emit('game:resign', { matchId })
  }

  offerDraw(matchId) {
    this.emit('game:offerDraw', { matchId })
  }

  acceptDraw(matchId) {
    this.emit('game:acceptDraw', { matchId })
  }

  // Room events
  createRoom(settings) {
    this.emit('room:create', settings)
  }

  joinRoom(roomCode) {
    this.emit('room:join', { code: roomCode })
  }

  leaveRoom(roomCode) {
    this.emit('room:leave', { code: roomCode })
  }

  startRoomGame(roomCode) {
    this.emit('room:startGame', { code: roomCode })
  }

  onRoomPlayerJoined(callback) {
    this.on('room:playerJoined', callback)
  }

  onRoomPlayerLeft(callback) {
    this.on('room:playerLeft', callback)
  }

  onRoomGameStarted(callback) {
    this.on('room:gameStarted', callback)
  }

  // Tournament events
  registerTournament(tournamentId) {
    this.emit('tournament:register', { tournamentId })
  }

  withdrawTournament(tournamentId) {
    this.emit('tournament:withdraw', { tournamentId })
  }

  onTournamentUpdate(callback) {
    this.on('tournament:playerRegistered', callback)
    this.on('tournament:playerWithdrawn', callback)
    this.on('tournament:started', callback)
    this.on('tournament:roundUpdate', callback)
  }

  onTournamentMatchReady(callback) {
    this.on('tournament:matchReady', callback)
  }

  // Cleanup all listeners
  removeAllListeners() {
    if (!this.socket) return

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.off(event, callback)
      })
    })

    this.listeners.clear()
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

// Export singleton instance
const socketService = new SocketService()
export default socketService
