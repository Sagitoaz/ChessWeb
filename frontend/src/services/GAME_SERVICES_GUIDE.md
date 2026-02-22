# Game Services - Usage Guide

Hướng dẫn sử dụng các services và hooks cho game module.

## 📁 Structure

```
src/services/
├── gameService.js      // API calls cho game (ranked, rooms, tournaments)
└── socketService.js    // WebSocket connection manager

src/hooks/
├── useWebSocket.js     // Custom hooks cho WebSocket
└── useChessGame.js     // Custom hooks cho chess logic
```

---

## 🎮 Game Service

### Import
```javascript
import gameService from '@/services/gameService'
```

### Ranked Match APIs

#### Join Ranked Queue
```javascript
const { success, queuePosition, estimatedWaitTime } = await gameService.joinRankedQueue()
```

#### Leave Ranked Queue
```javascript
await gameService.leaveRankedQueue()
```

#### Get Match Details
```javascript
const match = await gameService.getMatch(matchId)
// Returns: { id, type, players, timeControl, fen, moves, status, ... }
```

#### Get Ranked History
```javascript
const { matches, pagination } = await gameService.getRankedHistory(page, limit)
```

#### Get Ranked Stats
```javascript
const stats = await gameService.getRankedStats()
// Returns: { currentRating, wins, losses, draws, winRate, ... }
```

#### Make Move
```javascript
const result = await gameService.makeMove(matchId, move)
// move = { from: 'e2', to: 'e4' } or SAN notation
```

#### Game Actions
```javascript
await gameService.resignGame(matchId)
await gameService.offerDraw(matchId)
await gameService.respondToDrawOffer(matchId, accept)
```

### Room APIs

#### Create Room
```javascript
const room = await gameService.createRoom({
  isPrivate: false,
  allowSpectators: true,
  timeControl: { initial: 600, increment: 5 },
  rated: false
})
// Returns: { code, host, settings, players, status, ... }
```

#### Join/Leave Room
```javascript
await gameService.joinRoom(roomCode)
await gameService.leaveRoom(roomCode)
```

#### Get Room Details
```javascript
const room = await gameService.getRoom(roomCode)
```

#### Start Room Game
```javascript
const { matchId } = await gameService.startRoomGame(roomCode)
```

### Tournament APIs

#### Get Tournaments List
```javascript
const { tournaments } = await gameService.getTournaments({
  status: 'upcoming', // upcoming, registration, active, completed
  type: 'swiss'       // single-elimination, round-robin, swiss
})
```

#### Get Tournament Details
```javascript
const tournament = await gameService.getTournament(tournamentId)
```

#### Join/Withdraw Tournament
```javascript
await gameService.joinTournament(tournamentId)
await gameService.withdrawTournament(tournamentId)
```

#### Create Tournament
```javascript
const tournament = await gameService.createTournament({
  name: 'My Tournament',
  type: 'swiss',
  timeControl: { initial: 180, increment: 2 },
  maxPlayers: 16,
  startTime: new Date('2024-12-31T19:00:00')
})
```

---

## 🔌 WebSocket Hooks

### useWebSocket - Base WebSocket Hook

```javascript
import { useWebSocket } from '@/hooks'

function MyComponent() {
  const { 
    isConnected, 
    connectionError,
    connect, 
    disconnect, 
    on, 
    off, 
    emit 
  } = useWebSocket(autoConnect = true)

  useEffect(() => {
    // Listen to custom events
    on('customEvent', (data) => {
      console.log('Event received:', data)
    })
  }, [on])

  const sendCustomEvent = () => {
    emit('customEvent', { message: 'Hello' })
  }

  return (
    <div>
      Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}
    </div>
  )
}
```

### useGameSocket - Game-Specific Events

```javascript
import { useGameSocket } from '@/hooks'

function GameBoard({ matchId }) {
  const {
    isConnected,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    onMoveUpdate,
    onTimeUpdate,
    onGameEnd,
    onDrawOffer,
  } = useGameSocket(matchId)

  useEffect(() => {
    // Listen for opponent moves
    onMoveUpdate((data) => {
      console.log('Opponent moved:', data.move)
    })

    // Listen for time updates
    onTimeUpdate((data) => {
      console.log('Time:', data.timeRemaining)
    })

    // Listen for game end
    onGameEnd((data) => {
      console.log('Game ended:', data.result)
    })
  }, [onMoveUpdate, onTimeUpdate, onGameEnd])

  const handleMove = (move) => {
    sendMove(move) // Send to server via WebSocket
  }

  return <div>Game Board...</div>
}
```

### useRankedSocket - Ranked Queue Events

```javascript
import { useRankedSocket } from '@/hooks'

function RankedQueue() {
  const { 
    isConnected, 
    joinQueue, 
    leaveQueue, 
    onMatchFound,
    onQueueUpdate 
  } = useRankedSocket()

  useEffect(() => {
    onMatchFound((data) => {
      console.log('Match found!', data)
      // Navigate to game...
    })

    onQueueUpdate((data) => {
      console.log('Queue position:', data.position)
    })
  }, [onMatchFound, onQueueUpdate])

  return (
    <button onClick={() => joinQueue(userId, rating)}>
      Join Queue
    </button>
  )
}
```

### useRoomSocket - Room Events

```javascript
import { useRoomSocket } from '@/hooks'

function RoomLobby({ roomCode }) {
  const {
    isConnected,
    joinRoom,
    leaveRoom,
    startGame,
    sendMessage,
    onPlayerJoined,
    onPlayerLeft,
    onGameStarted,
  } = useRoomSocket(roomCode)

  useEffect(() => {
    joinRoom()

    onPlayerJoined((player) => {
      console.log('Player joined:', player.username)
    })

    onGameStarted((data) => {
      console.log('Game started!', data.matchId)
      // Navigate to game...
    })

    return () => leaveRoom()
  }, [])

  return <div>Room Lobby...</div>
}
```

### useTournamentSocket - Tournament Events

```javascript
import { useTournamentSocket } from '@/hooks'

function TournamentView({ tournamentId }) {
  const {
    register,
    withdraw,
    onPlayerRegistered,
    onTournamentStarted,
    onMatchReady,
  } = useTournamentSocket(tournamentId)

  useEffect(() => {
    onPlayerRegistered((player) => {
      console.log('Player registered:', player)
    })

    onTournamentStarted(() => {
      console.log('Tournament started!')
    })

    onMatchReady((data) => {
      console.log('Your match is ready!', data)
    })
  }, [])

  return (
    <button onClick={register}>
      Register for Tournament
    </button>
  )
}
```

---

## ♟️ Chess Game Hooks

### useChessGame - Local Chess Game

```javascript
import { useChessGame } from '@/hooks'

function ChessBoard() {
  const {
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
    selectSquare,
    onSquareClick,
    
    // Utilities
    getPieceAt,
    getLegalMoves,
    getPgn,
    getMoveCount,
    getGameResult,
  } = useChessGame({
    initialFen: null, // null = starting position
    onMove: (move) => {
      console.log('Move made:', move)
    },
    onGameEnd: ({ status, result }) => {
      console.log('Game ended:', result)
    },
  })

  return (
    <div>
      <div>Turn: {currentTurn === 'w' ? 'White' : 'Black'}</div>
      <div>Move: {getMoveCount()}</div>
      
      {gameStatus.isCheck && <div>Check!</div>}
      {gameStatus.isCheckmate && <div>Checkmate!</div>}
      
      <button onClick={undoMove}>Undo</button>
      <button onClick={resetGame}>Reset</button>
      
      <div className="board">
        {[...Array(64)].map((_, i) => {
          const square = /* calculate square name */
          const piece = getPieceAt(square)
          const isSelected = selectedSquare === square
          const isValidMove = validMoves.includes(square)
          
          return (
            <div 
              key={i}
              onClick={() => onSquareClick(square)}
              className={`square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid' : ''}`}
            >
              {piece && <Piece piece={piece} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### useOnlineChessGame - Online Chess Game with Opponent

```javascript
import { useOnlineChessGame, useGameSocket } from '@/hooks'

function OnlineGame({ matchId, playerColor }) {
  const gameSocket = useGameSocket(matchId)
  
  const {
    fen,
    currentTurn,
    gameStatus,
    onSquareClick,
    isMyTurn,
    opponentMove,
    // ... all other methods from useChessGame
  } = useOnlineChessGame({
    matchId,
    playerColor, // 'w' or 'b'
    gameSocket,
    onMove: (move) => {
      console.log('I moved:', move)
    },
    onGameEnd: ({ status, result }) => {
      console.log('Game ended:', result)
    },
  })

  useEffect(() => {
    if (opponentMove) {
      console.log('Opponent moved:', opponentMove)
    }
  }, [opponentMove])

  return (
    <div>
      <div>
        Turn: {currentTurn === 'w' ? 'White' : 'Black'}
        {isMyTurn && ' (Your turn)'}
      </div>
      
      {/* Board rendering - onSquareClick only works on your turn */}
      <div className="board" onClick={(e) => {
        if (isMyTurn) {
          onSquareClick(getSquareFromClick(e))
        }
      }}>
        {/* ... */}
      </div>
    </div>
  )
}
```

---

## 🎯 Complete Example: Online Ranked Game

```javascript
import React, { useEffect, useState } from 'react'
import { useOnlineChessGame, useGameSocket, useRankedSocket } from '@/hooks'
import gameService from '@/services/gameService'

function RankedGame() {
  const [inQueue, setInQueue] = useState(false)
  const [matchId, setMatchId] = useState(null)
  const [playerColor, setPlayerColor] = useState(null)
  
  // Ranked queue socket
  const { joinQueue, leaveQueue, onMatchFound } = useRankedSocket()
  
  // Game socket
  const gameSocket = useGameSocket(matchId)
  
  // Chess game
  const chessGame = useOnlineChessGame({
    matchId,
    playerColor,
    gameSocket,
    onMove: (move) => console.log('Move:', move),
    onGameEnd: ({ result }) => {
      alert(`Game ended: ${result}`)
    },
  })

  // Queue management
  const handleJoinQueue = async () => {
    await gameService.joinRankedQueue()
    joinQueue(userId, rating)
    setInQueue(true)
  }

  const handleLeaveQueue = async () => {
    await gameService.leaveRankedQueue()
    leaveQueue()
    setInQueue(false)
  }

  // Match found
  useEffect(() => {
    onMatchFound((data) => {
      setMatchId(data.matchId)
      setPlayerColor(data.yourColor)
      setInQueue(false)
    })
  }, [onMatchFound])

  // Game events
  useEffect(() => {
    if (!matchId) return

    gameSocket.onTimeUpdate((data) => {
      // Update clocks
    })

    gameSocket.onGameEnd((data) => {
      // Handle game end
    })
  }, [matchId, gameSocket])

  if (inQueue) {
    return (
      <div>
        <h2>Searching for opponent...</h2>
        <button onClick={handleLeaveQueue}>Cancel</button>
      </div>
    )
  }

  if (!matchId) {
    return (
      <div>
        <button onClick={handleJoinQueue}>Play Ranked</button>
      </div>
    )
  }

  return (
    <div>
      <ChessBoard 
        {...chessGame}
        onMove={(from, to) => chessGame.movePiece(from, to)}
      />
      
      <div className="game-controls">
        <button onClick={gameSocket.resign}>Resign</button>
        <button onClick={gameSocket.offerDraw}>Offer Draw</button>
      </div>
    </div>
  )
}
```

---

## 🔧 Configuration

### Mock Mode
Tất cả services hỗ trợ mock mode cho development. Set trong `.env`:
```
VITE_USE_MOCK=true
```

### API Endpoints
Config trong `.env`:
```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## 📝 Notes

- Tất cả hooks tự động cleanup khi component unmount
- WebSocket auto-reconnect với exponential backoff
- Chess game validation dùng chess.js library
- Hỗ trợ đầy đủ FEN và PGN
- Mock data cho development/testing

---

## 🚀 Next Steps

1. Integrate với UI components
2. Add error handling và loading states
3. Implement notification system
4. Add chess clock component
5. Create matchmaking UI
