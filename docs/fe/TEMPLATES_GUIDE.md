# ChessWeb - Hướng Dẫn Sử Dụng Templates

## 📁 Cấu Trúc Thư Mục Templates

```
frontend-templates/
├── constants.js              # Constants và API endpoints
├── api.js                    # Axios setup và mock API
├── socketService.js          # WebSocket service
├── chessLogic.js            # Chess.js wrapper
├── hooks.js                 # Custom React hooks
└── components-example.jsx   # Component examples
```

## 🚀 Cách Sử Dụng

### 1. Copy Files vào Project

Sau khi setup xong project (theo `SETUP_GUIDE.md`), copy các file template:

```bash
# Từ thư mục ChessWeb/
cp frontend-templates/constants.js frontend/src/utils/
cp frontend-templates/api.js frontend/src/services/
cp frontend-templates/socketService.js frontend/src/services/
cp frontend-templates/chessLogic.js frontend/src/utils/
cp frontend-templates/hooks.js frontend/src/hooks/
```

### 2. Sử Dụng Constants

```javascript
// src/pages/auth/LoginPage.jsx
import { API_ENDPOINTS } from '../../utils/constants'

const login = async (credentials) => {
  const response = await api.post(API_ENDPOINTS.LOGIN, credentials)
  return response
}
```

### 3. Sử Dụng API Service

```javascript
// src/pages/profile/ProfilePage.jsx
import { apiCall } from '../../services/api'
import { API_ENDPOINTS } from '../../utils/constants'

const ProfilePage = () => {
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiCall('GET', API_ENDPOINTS.GET_PROFILE)
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    
    fetchProfile()
  }, [])
  
  // ...
}
```

### 4. Sử Dụng WebSocket

```javascript
// src/pages/ranked/RankedLobbyPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import socketService from '../../services/socketService'
import { SOCKET_EVENTS } from '../../utils/constants'

const RankedLobbyPage = () => {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Connect socket
    socketService.connect()
    
    // Listen for match found
    socketService.on(SOCKET_EVENTS.RANKED_MATCH_FOUND, (data) => {
      console.log('Match found!', data)
      navigate(`/ranked/game/${data.matchId}`)
    })
    
    // Cleanup
    return () => {
      socketService.off(SOCKET_EVENTS.RANKED_MATCH_FOUND)
    }
  }, [])
  
  const handleFindMatch = () => {
    const user = JSON.parse(localStorage.getItem('user'))
    socketService.joinRankedQueue(user.id, user.rating)
  }
  
  return (
    <button onClick={handleFindMatch}>Find Match</button>
  )
}
```

### 5. Sử Dụng Chess Logic

```javascript
// src/pages/bot/BotGamePage.jsx
import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { ChessGame } from '../../utils/chessLogic'

const BotGamePage = () => {
  const [game] = useState(new ChessGame())
  const [fen, setFen] = useState(game.fen())
  
  const handleMove = (from, to) => {
    const move = game.move({ from, to })
    if (move) {
      setFen(game.fen())
      
      // Check game status
      if (game.isGameOver()) {
        const result = game.getResult()
        const reason = game.getResultReason()
        alert(`Game over! Result: ${result}, Reason: ${reason}`)
      }
      
      // Get bot move (mock)
      setTimeout(() => {
        const moves = game.moves()
        const randomMove = moves[Math.floor(Math.random() * moves.length)]
        game.move(randomMove)
        setFen(game.fen())
      }, 1000)
    }
  }
  
  return (
    <div>
      <Chessboard
        position={fen}
        onPieceDrop={(from, to) => {
          handleMove(from, to)
          return true
        }}
      />
    </div>
  )
}
```

### 6. Sử Dụng Custom Hooks

```javascript
// src/pages/ranked/RankedGamePage.jsx
import { useTimer, useChessGame, useWebSocket } from '../../hooks'

const RankedGamePage = () => {
  const { fen, makeMove, isCheckmate } = useChessGame()
  const whiteTimer = useTimer(600) // 10 minutes
  const blackTimer = useTimer(600)
  const { socket, isConnected } = useWebSocket()
  
  const handleMove = (from, to) => {
    const move = makeMove({ from, to })
    if (move) {
      // Send move to opponent via WebSocket
      socket.sendMove(matchId, move)
      
      // Switch timer
      whiteTimer.pause()
      blackTimer.start()
    }
  }
  
  return (
    <div>
      <div>White: {formatTime(whiteTimer.time)}</div>
      <Chessboard position={fen} onPieceDrop={handleMove} />
      <div>Black: {formatTime(blackTimer.time)}</div>
    </div>
  )
}
```

### 7. Sử Dụng Components

```javascript
// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { Input, Button, Card } from '../../components/common'

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await apiCall('POST', API_ENDPOINTS.LOGIN, {
        username,
        password
      })
      
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
          
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            error={error}
          />
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            Login
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

## 🎯 Best Practices

### 1. API Calls
```javascript
// ✅ GOOD: Sử dụng try-catch và loading state
const fetchData = async () => {
  setLoading(true)
  try {
    const data = await apiCall('GET', API_ENDPOINTS.GET_PROFILE)
    setData(data)
  } catch (error) {
    toast.error(error.message)
  } finally {
    setLoading(false)
  }
}

// ❌ BAD: Không handle error
const fetchData = async () => {
  const data = await apiCall('GET', API_ENDPOINTS.GET_PROFILE)
  setData(data)
}
```

### 2. WebSocket Events
```javascript
// ✅ GOOD: Cleanup listeners
useEffect(() => {
  socketService.on('game:move', handleMove)
  
  return () => {
    socketService.off('game:move', handleMove)
  }
}, [])

// ❌ BAD: Không cleanup
useEffect(() => {
  socketService.on('game:move', handleMove)
}, [])
```

### 3. Chess Moves
```javascript
// ✅ GOOD: Validate move trước khi gửi
const handleMove = (from, to) => {
  if (game.isValidMove(from, to)) {
    const move = game.move({ from, to })
    socket.sendMove(matchId, move)
  }
}

// ❌ BAD: Không validate
const handleMove = (from, to) => {
  game.move({ from, to })
  socket.sendMove(matchId, { from, to })
}
```

### 4. State Management
```javascript
// ✅ GOOD: Sử dụng functional update
setCount(prev => prev + 1)

// ❌ BAD: Có thể bị stale closure
setCount(count + 1)
```

## 🔧 Customization

### Thay đổi Mock Mode

Trong `constants.js`:
```javascript
// Development: Sử dụng mock
const USE_MOCK = true

// Production: Sử dụng API thật
const USE_MOCK = false
```

### Thêm API Endpoint mới

Trong `constants.js`:
```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  GET_FRIENDS: '/users/friends',
  ADD_FRIEND: '/users/friends/:id',
}
```

Trong `api.js` (nếu cần mock):
```javascript
const mockAPI = {
  // ... existing mocks
  async getFriends() {
    return {
      data: [
        { id: 1, username: 'Friend1', online: true },
        { id: 2, username: 'Friend2', online: false },
      ]
    }
  }
}
```

### Thêm WebSocket Event mới

Trong `constants.js`:
```javascript
export const SOCKET_EVENTS = {
  // ... existing events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
}
```

Trong `socketService.js`:
```javascript
// Convenience methods
sendChatMessage(matchId, message) {
  this.emit('chat:message', { matchId, message })
}

onChatMessage(callback) {
  this.on('chat:message', callback)
}
```

## 📚 Tài Liệu Tham Khảo

### Chess.js Methods
```javascript
game.move('e4')          // Make move in SAN
game.move({ from: 'e2', to: 'e4' })  // Make move with object
game.undo()              // Undo last move
game.moves()             // Get all legal moves
game.moves({ square: 'e2' })  // Get moves for specific square
game.inCheck()           // Check if in check
game.isCheckmate()       // Check if checkmate
game.isStalemate()       // Check if stalemate
game.isDraw()            // Check if draw
game.fen()               // Get current FEN
game.pgn()               // Get PGN string
```

### React Chessboard Props
```jsx
<Chessboard
  position={fen}                    // FEN string
  onPieceDrop={(from, to) => {}}   // Piece drop handler
  boardWidth={400}                  // Board size in pixels
  customBoardStyle={{}}             // Custom board styles
  customDarkSquareStyle={{}}        // Dark square style
  customLightSquareStyle={{}}       // Light square style
  showBoardNotation={true}          // Show coordinates
  arePiecesDraggable={true}         // Enable drag
/>
```

### Socket.io Client Events
```javascript
socket.on('connect', () => {})
socket.on('disconnect', (reason) => {})
socket.on('connect_error', (error) => {})
socket.emit('event', data)
socket.off('event', callback)
```

## ⚠️ Common Issues

### Issue 1: Socket not connecting
```javascript
// Solution: Check if token exists
const token = localStorage.getItem('token')
if (!token) {
  navigate('/login')
  return
}
socketService.connect(token)
```

### Issue 2: Stale chess board state
```javascript
// Solution: Use key to force re-render
<Chessboard key={gameId} position={fen} />
```

### Issue 3: Memory leak from timers
```javascript
// Solution: Always cleanup
useEffect(() => {
  const interval = setInterval(() => {}, 1000)
  return () => clearInterval(interval)
}, [])
```

## 🎉 Ready to Code!

Bây giờ team đã có đầy đủ:
- ✅ Project structure
- ✅ Common utilities
- ✅ Service templates
- ✅ Hook templates
- ✅ Component examples
- ✅ Best practices

**Bắt đầu code pages của mình theo phân công trong `WORK_DISTRIBUTION.md`!**

Nếu có vấn đề, hỏi trong nhóm hoặc tham khảo documentation.

Good luck! 🚀
