import { useState, useCallback, useMemo, useEffect } from 'react'
import { Chess } from 'chess.js'
import { DEFAULT_INITIAL_FEN, getGameMoves, getInitialFen } from '@/utils/gameShape'

function computeFENAtIndex(initialFEN, moves, targerIndex) {
  const chess = new Chess(initialFEN)
  for (let i = 0; i <= targerIndex; i++) {
    const m = moves[i]
    if (!m) break
    try {
      chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion ?? undefined,
      })
    } catch {
      console.error(`Invalid move at index ${i}:`, m)
      return null
    }
  }
  return chess.fen()
}
export function useReplayControls(gameData) {
  // ReplaySession.cursor: -1 = initial position (trước move đầu tiên)
  const [cursor, setCursor] = useState(-1)
  const [error, setError] = useState(null)

  const moves = useMemo(() => getGameMoves(gameData), [gameData])
  const initialFEN = getInitialFen(gameData) || DEFAULT_INITIAL_FEN

  // ReplaySession.load(game) — reset khi load game mới
  useEffect(() => {
    setCursor(-1)
    setError(null)
  }, [gameData?.id])

  // ReplaySession.currentFEN()
  const currentFEN = useMemo(() => {
    if (cursor < 0) return initialFEN
    return computeFENAtIndex(initialFEN, moves, cursor) ?? initialFEN
  }, [cursor, initialFEN, moves])

  const canStepForward = cursor < moves.length - 1 // ReplaySession.canStepForward()
  const canStepBackward = cursor >= 0 // ReplaySession.canStepBackward()
  const currentMove = cursor >= 0 ? moves[cursor] : null // ReplaySession.getCurrentMove()
  const progress = moves.length === 0 ? 0 : (cursor + 1) / moves.length // ReplaySession.getProgress()

  // ReplaySession.stepForward()
  // A2_ReplayFlow.puml: "cursor < lastMoveIndex → cursor++"
  const stepForward = useCallback(() => {
    if (!canStepForward) {
      setError('Already at end')
      return false
    }
    setError(null)
    setCursor((c) => c + 1)
    return true
  }, [canStepForward])

  // ReplaySession.stepBackward()
  // A2_ReplayFlow.puml: "cursor > 0 → cursor-- → Rebuild board from initial + moves[1..cursor]"
  const stepBackward = useCallback(() => {
    if (!canStepBackward) {
      setError('Already at start')
      return false
    }
    setError(null)
    setCursor((c) => c - 1)
    return true
  }, [canStepBackward])

  // ReplaySession.jumpTo(moveIndex)
  // S2_LoadReplay.puml: "Invalid step/index → error('Invalid move index')"
  const jumpTo = useCallback(
    (moveIndex) => {
      if (moveIndex < -1 || moveIndex >= moves.length) {
        setError('Invalid move index')
        return false
      }
      setError(null)
      setCursor(moveIndex)
      return true
    },
    [moves.length]
  )

  // ReplaySession.reset()
  const reset = useCallback(() => {
    setCursor(-1)
    setError(null)
  }, [])

  return {
    cursor,
    currentFEN,
    currentMove,
    moves,
    progress,
    error,
    stepForward,
    stepBackward,
    jumpTo,
    reset,
    canStepForward,
    canStepBackward,
    totalMoves: moves.length,
    currentMoveNumber: cursor + 1, // 1-based for display
    isAtStart: cursor < 0,
    isAtEnd: cursor >= moves.length - 1,
  }
}
