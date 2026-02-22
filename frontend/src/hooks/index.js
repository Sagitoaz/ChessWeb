import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import socketService from '../services/socketService'

// Export auth hook
export { default as useAuth } from './useAuth'

/**
 * Custom hook for WebSocket connection
 */
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (token) {
      socketService.connect(token)
      
      socketService.on('connect', () => {
        setIsConnected(true)
        setError(null)
      })

      socketService.on('disconnect', () => {
        setIsConnected(false)
      })

      socketService.on('connect_error', (err) => {
        setError(err.message)
      })
    }

    return () => {
      socketService.removeAllListeners()
    }
  }, [])

  return {
    socket: socketService,
    isConnected,
    error,
  }
}

/**
 * Custom hook for chess game state
 */
export const useChessGame = (initialFen = null) => {
  const [game] = useState(() => new Chess(initialFen))
  const [fen, setFen] = useState(game.fen())
  const [history, setHistory] = useState([])
  const [turn, setTurn] = useState(game.turn())

  const makeMove = (move) => {
    const result = game.move(move)
    if (result) {
      setFen(game.fen())
      setHistory(game.history({ verbose: true }))
      setTurn(game.turn())
      return result
    }
    return null
  }

  const undoMove = () => {
    const result = game.undo()
    if (result) {
      setFen(game.fen())
      setHistory(game.history({ verbose: true }))
      setTurn(game.turn())
    }
    return result
  }

  const reset = () => {
    game.reset()
    setFen(game.fen())
    setHistory([])
    setTurn('w')
  }

  const loadFen = (newFen) => {
    game.load(newFen)
    setFen(newFen)
    setHistory(game.history({ verbose: true }))
    setTurn(game.turn())
  }

  return {
    game,
    fen,
    history,
    turn,
    makeMove,
    undoMove,
    reset,
    loadFen,
    isCheck: game.inCheck(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
  }
}

/**
 * Custom hook for countdown timer
 */
export const useTimer = (initialTime, autoStart = false) => {
  const [time, setTime] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(autoStart)

  useEffect(() => {
    if (!isRunning || time <= 0) return

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, time])

  const start = () => setIsRunning(true)
  const pause = () => setIsRunning(false)
  const reset = (newTime = initialTime) => {
    setTime(newTime)
    setIsRunning(false)
  }
  const add = (seconds) => setTime((prev) => prev + seconds)

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    add,
  }
}

/**
 * Custom hook for local storage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue, removeValue]
}

/**
 * Custom hook for debounce
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for window size
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

/**
 * Custom hook for click outside
 */
export const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, callback])
}
