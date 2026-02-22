import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useTimer Hook
 * Custom hook for countdown timer with pause/resume functionality
 *
 * @param {number} initialTime - Initial time in milliseconds
 * @param {number} interval - Update interval in milliseconds (default: 100)
 * @param {function} onComplete - Callback when timer reaches 0
 * @returns {object} Timer state and controls
 */
export const useTimer = (initialTime = 0, interval = 100, onComplete = null) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const remainingTimeRef = useRef(initialTime)

  const start = useCallback(() => {
    if (timeLeft > 0) {
      setIsRunning(true)
      setIsPaused(false)
      startTimeRef.current = Date.now()
      remainingTimeRef.current = timeLeft
    }
  }, [timeLeft])

  const pause = useCallback(() => {
    if (isRunning) {
      setIsPaused(true)
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  const resume = useCallback(() => {
    if (isPaused && timeLeft > 0) {
      setIsPaused(false)
      setIsRunning(true)
      startTimeRef.current = Date.now()
      remainingTimeRef.current = timeLeft
    }
  }, [isPaused, timeLeft])

  const stop = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setTimeLeft(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(
    (newTime = initialTime) => {
      setIsRunning(false)
      setIsPaused(false)
      setTimeLeft(newTime)
      remainingTimeRef.current = newTime
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    },
    [initialTime]
  )

  const addTime = useCallback((milliseconds) => {
    setTimeLeft((prev) => {
      const newTime = prev + milliseconds
      remainingTimeRef.current = newTime
      return newTime
    })
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, remainingTimeRef.current - elapsed)

        setTimeLeft(remaining)

        if (remaining === 0) {
          setIsRunning(false)
          clearInterval(intervalRef.current)
          intervalRef.current = null
          onComplete?.()
        }
      }, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, interval, onComplete])

  useEffect(() => {
    remainingTimeRef.current = timeLeft
  }, [timeLeft])

  const formatTime = useCallback((ms, showMilliseconds = false) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    if (showMilliseconds && ms < 60000) {
      return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [])

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    addTime,
    formatTime,
    percentage: initialTime > 0 ? (timeLeft / initialTime) * 100 : 0,
  }
}

export default useTimer
