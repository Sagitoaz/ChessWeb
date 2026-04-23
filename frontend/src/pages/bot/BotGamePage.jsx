import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ChessBoard } from '@components/game'
import { useNotification } from '@hooks'
import { botGameAPI } from '@services/gameService'
import { Avatar, Button } from '@components/common'
import { MainLayout } from '@components/layout'
import { Flag, List, ArrowLeft, Trophy, Lightbulb, RefreshCcw } from 'lucide-react'
import { THEME } from '@/styles/theme'
import { buildMovePairs, getMoveLabel } from '@/utils/moveNotation'

// ─── Inline MoveListPanel (same style as RankedGamePage) ───
const MoveListPanel = ({ moves }) => {
  const endRef = useRef(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-6">
        Chưa có nước đi nào
      </div>
    )
  }

  const pairs = buildMovePairs(moves).map((pair) => ({
    n: pair.fullMove,
    w: pair.white,
    b: pair.black,
    wi: pair.whiteIndex,
    bi: pair.blackIndex,
  }))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {pairs.map((p) => (
          <div key={p.n} className="flex items-center gap-1 text-sm">
            <span className="w-7 text-gray-400 text-xs font-mono text-right shrink-0">{p.n}.</span>
            <span
              className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                p.wi === moves.length - 1
                  ? 'bg-yellow-100 text-yellow-800 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {getMoveLabel(p.w)}
            </span>
            {p.b ? (
              <span
                className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                  p.bi === moves.length - 1
                    ? 'bg-yellow-100 text-yellow-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {getMoveLabel(p.b)}
              </span>
            ) : (
              <span className="flex-1" />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

export default function BotGamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { gameId } = useParams()
  const { error: showError, success: showSuccess } = useNotification()

  // Nhận gameData từ BotSelectPage qua navigation state
  const storedGameData = useMemo(() => {
    if (!gameId) return null
    try {
      const raw = sessionStorage.getItem(`bot-game-${gameId}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [gameId])
  const { gameData: locationGameData, sessionId: sessionIdFromState } = location.state ?? {}
  const gameData = locationGameData ?? storedGameData
  const botSessionId =
    gameData?.sessionId ?? sessionIdFromState ?? storedGameData?.sessionId ?? null
  const [gameState, setGameState] = useState('Waiting')
  // chess instance là "live" — truyền trực tiếp vào ChessBoard làm gameState prop
  const [chess] = useState(() => new Chess(gameData?.initialFEN ?? undefined))
  // tick dùng để force re-render sau mỗi nước đi (chess mutates in-place)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick((n) => n + 1), [])
  const [moveHistory, setMoveHistory] = useState([])
  const [gameResult, setGameResult] = useState(null) // GameResult enum
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSavingResult, setIsSavingResult] = useState(false)
  const [tacticalHint, setTacticalHint] = useState(
    'Gia sư chiến thuật sẽ đưa gợi ý khi ván đấu có đủ dữ liệu.'
  )
  const [isHintLoading, setIsHintLoading] = useState(false)
  const [hintError, setHintError] = useState('')
  const abandonWithoutSaveRef = useRef(false)
  const lastHintRequestedPlyRef = useRef(0)
  const hintRequestSeqRef = useRef(0)
  const saveRequestInFlightRef = useRef(false)
  const botMoveRequestSeqRef = useRef(0)
  const botMoveFenInFlightRef = useRef(null)

  const buildReplayMoves = useCallback(() => {
    try {
      const verboseMoves = chess.history({ verbose: true })
      return verboseMoves.map((mv, idx) => ({
        ply: idx + 1,
        from: mv.from,
        to: mv.to,
        piece: mv.piece,
        captured: mv.captured,
        promotion: mv.promotion,
        san: mv.san,
        uci: `${mv.from}${mv.to}`,
        color: mv.color === 'w' ? 'White' : 'Black',
        isCheck: mv.san?.includes('+') || mv.san?.includes('#') || false,
        isCheckmate: mv.san?.includes('#') || false,
        timestamp: new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }, [chess])

  const playerColor = gameData?.playerColor ?? 'White'
  const playerColorCode = playerColor === 'White' ? 'w' : 'b'
  const playerSideLabel = playerColor === 'White' ? 'Trắng' : 'Đen'

  const persistFinishedGame = useCallback(
    async (result, { endReason } = {}) => {
      if (!gameId || !gameData || isSaved || abandonWithoutSaveRef.current) return false
      if (saveRequestInFlightRef.current) return false

      saveRequestInFlightRef.current = true
      setIsSavingResult(true)

      const derivedMoves = buildReplayMoves()
      const finalMoves = derivedMoves.length >= moveHistory.length ? derivedMoves : moveHistory
      const fallbackHuman = { username: 'You', isBot: false }
      const fallbackBot = { username: 'Bot', isBot: true }

      try {
        await botGameAPI.saveBotGame(gameId, {
          result,
          state: 'Saved',
          mode: 'bot',
          endReason,
          moves: finalMoves,
          initialFEN:
            gameData?.initialFEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          whitePlayer:
            playerColor === 'White'
              ? gameData?.humanPlayer || fallbackHuman
              : gameData?.botPlayer || fallbackBot,
          blackPlayer:
            playerColor === 'White'
              ? gameData?.botPlayer || fallbackBot
              : gameData?.humanPlayer || fallbackHuman,
          metadata: {
            totalMoves: finalMoves.length,
          },
        })
        setGameState('Saved')
        setIsSaved(true)
        showSuccess('Ván đấu đã được lưu vào lịch sử')
        return true
      } catch {
        showError('Không thể lưu ván đấu')
        return false
      } finally {
        saveRequestInFlightRef.current = false
        setIsSavingResult(false)
      }
    },
    [buildReplayMoves, gameData, gameId, isSaved, moveHistory, playerColor, showError, showSuccess]
  )

  const difficultyRaw = String(
    gameData?.config?.difficultyCode || gameData?.difficulty || gameData?.config?.difficulty || ''
  ).toLowerCase()

  const difficultyCode = (() => {
    if (difficultyRaw === 'easy' || difficultyRaw === 'beginner') return 'easy'
    if (difficultyRaw === 'normal' || difficultyRaw === 'medium' || difficultyRaw === 'intermediate') {
      return 'normal'
    }
    if (difficultyRaw === 'hard' || difficultyRaw === 'advanced') return 'hard'
    if (difficultyRaw === 'super_hard' || difficultyRaw === 'superhard' || difficultyRaw === 'expert') {
      return 'super_hard'
    }
    return 'normal'
  })()

  const difficultyLabel = {
    easy: 'Dễ',
    normal: 'Bình thường',
    hard: 'Khó',
    super_hard: 'Siêu cấp khó',
  }[difficultyCode]

  const difficultyBadgeClass = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    normal: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    hard: 'bg-orange-100 text-orange-700 border-orange-200',
    super_hard: 'bg-red-100 text-red-700 border-red-200',
  }[difficultyCode]

  // Redirect nếu không có gameData
  useEffect(() => {
    if (!gameData) {
      showError('Không tìm thấy thông tin game')
      navigate('/bot')
      return
    }
    try {
      sessionStorage.setItem(`bot-game-${gameData.gameId || gameId}`, JSON.stringify(gameData))
    } catch {
      // Ignore storage failures; game can still run from navigation state.
    }
    setGameState('InGame') // SM: Waiting → InGame
  }, [gameData, gameId, navigate, showError])

  // =============================================
  // CHECK END CONDITION
  // A1: "Check end condition (checkmate/stalemate/draw)"
  // =============================================
  const checkEndCondition = useCallback(
    (chessInst) => {
      if (chessInst.isCheckmate()) {
        const winner = chessInst.turn() === 'w' ? 'Black' : 'White'
        const result = winner === 'White' ? 'WhiteWin' : 'BlackWin'
        setGameResult(result)
        setGameState('Finished') // SM: InGame → Finished
        showSuccess(winner === 'White' ? 'Bạn đã thắng bot.' : 'Bạn đã thua bot.', {
          duration: 3500,
        })
        queueMicrotask(() => {
          void persistFinishedGame(result, { endReason: 'checkmate' })
        })
        return true
      }
      if (chessInst.isStalemate() || chessInst.isDraw()) {
        setGameResult('Draw')
        setGameState('Finished')
        showSuccess('Ván bot đã kết thúc với kết quả hòa.', { duration: 3500 })
        queueMicrotask(() => {
          void persistFinishedGame('Draw', { endReason: 'draw' })
        })
        return true
      }
      return false
    },
    [persistFinishedGame, showSuccess]
  )

  // =============================================
  // AUTO-SAVE khi Finished (SM: Finished → Saved)
  // UC6: Save Game to History
  // =============================================
  useEffect(() => {
    if (gameState === 'Finished' && gameResult && !isSaved && !abandonWithoutSaveRef.current) {
      void persistFinishedGame(gameResult)
    }
  }, [
    gameState,
    gameResult,
    isSaved,
    persistFinishedGame,
  ])

  // =============================================
  // BOT MOVE
  // A1: "Bot computes best move (Stockfish / engine)"
  //
  // Production: submit player move → server gọi POST /bot/move { sessionId, FEN } → trả botMove
  // Mock: random move bằng chess.js (không có backend)
  // =============================================
  const executeBotMove = useCallback(
    async (chessInst) => {
      const expectedFen = chessInst.fen()
      if (botMoveFenInFlightRef.current === expectedFen) {
        return
      }

      const requestId = botMoveRequestSeqRef.current + 1
      botMoveRequestSeqRef.current = requestId
      botMoveFenInFlightRef.current = expectedFen
      setIsBotThinking(true)
      try {
        if (!botSessionId) {
          throw new Error('Missing bot session id')
        }
        const requestTimeoutMs = Math.max(
          Number(gameData?.config?.requestTimeoutMs || 0),
          Number(gameData?.config?.timeLimitMs || 0) + 7000,
          10000
        )
        const botResponse = await botGameAPI.getBotMove(botSessionId, expectedFen, {
          timeoutMs: requestTimeoutMs,
        })
        if (requestId !== botMoveRequestSeqRef.current) {
          return
        }
        if (chessInst.fen() !== expectedFen) {
          return
        }
        const uci = botResponse?.move?.bestMoveUci || botResponse?.bestMoveUci
        if (!uci || uci.length < 4) {
          throw new Error('Invalid bot move from server')
        }

        const result = chessInst.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
        })

        if (!result) {
          return
        }

        if (result) {
          forceUpdate()
          setMoveHistory((prev) => [
            ...prev,
            {
              ply: prev.length + 1,
              from: result.from,
              to: result.to,
              piece: result.piece,
              captured: result.captured,
              promotion: result.promotion,
              san: result.san,
              uci: `${result.from}${result.to}`,
              color: result.color === 'w' ? 'White' : 'Black',
              isCheck: chessInst.inCheck(),
              isCheckmate: chessInst.isCheckmate(),
              timestamp: new Date().toISOString(),
            },
          ])
          checkEndCondition(chessInst)
        }
      } catch (error) {
        if (requestId !== botMoveRequestSeqRef.current) {
          return
        }
        showError((error && error.message) || 'Bot gặp lỗi') // S1: 503/504
      } finally {
        if (botMoveFenInFlightRef.current === expectedFen) {
          botMoveFenInFlightRef.current = null
        }
        if (requestId === botMoveRequestSeqRef.current) {
          setIsBotThinking(false)
        }
      }
    },
    [botSessionId, checkEndCondition, showError, forceUpdate, gameData]
  )

  // Nếu player chọn Black, bot (White) đi trước — trigger ngay khi vào game
  useEffect(() => {
    if (gameState === 'InGame' && !isBotThinking && chess.turn() !== playerColorCode) {
      executeBotMove(chess)
    }
  }, [chess, executeBotMove, gameState, playerColorCode, isBotThinking])

  // =============================================
  // USER MOVE — UC3: Make Move
  // ChessBoard performs chess.move() internally and passes back the result object.
  // Our job: record it, check end condition, trigger bot turn.
  // =============================================
  const handleMove = useCallback(
    (moveResult) => {
      if (gameState !== 'InGame') return
      if (isBotThinking) return
      // moveResult is the object returned by chess.js .move()
      // ChessBoard already applied it to the chess instance
      forceUpdate()
      setMoveHistory((prev) => [
        ...prev,
        {
          ply: prev.length + 1,
          from: moveResult.from,
          to: moveResult.to,
          piece: moveResult.piece,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          san: moveResult.san,
          uci: `${moveResult.from}${moveResult.to}`,
          color: moveResult.color === 'w' ? 'White' : 'Black',
          isCheck: chess.inCheck(),
          isCheckmate: chess.isCheckmate(),
          timestamp: new Date().toISOString(),
        },
      ])

      // Production: gọi submitPlayerMove và nhận botMove từ server
      // const res = await botGameAPI.submitPlayerMove(gameId, { from, to, promotion: 'q' })
      // if (res.gameFinished) { setGameResult(res.result); setGameState('Finished'); return }

      if (!checkEndCondition(chess)) {
        executeBotMove(chess) // A1: bot turn
      }
    },
    [chess, gameState, isBotThinking, checkEndCondition, executeBotMove, forceUpdate]
  )

  // Resign — SM: InGame → Finished
  const handleResign = () => {
    const result = playerColor === 'White' ? 'BlackWin' : 'WhiteWin'
    setGameResult(result)
    setGameState('Finished')
    void persistFinishedGame(result, { endReason: 'resignation' })
  }

  const requestTacticalHint = useCallback(
    async ({ manual = false } = {}) => {
      if (gameState !== 'InGame' && gameState !== 'Paused') return
      if (isHintLoading) return

      const pgn = chess.pgn()
      if (!pgn || pgn.trim().length < 8) {
        setTacticalHint(
          `Bạn đang cầm quân ${playerSideLabel}. Cần thêm vài nước đi nữa để đưa gợi ý ngắn gọn.`
        )
        setHintError('')
        return
      }

      const requestId = hintRequestSeqRef.current + 1
      hintRequestSeqRef.current = requestId
      setIsHintLoading(true)
      setHintError('')

      try {
        const responsePromise = botGameAPI.getTacticalHint(pgn, 'quick', {
          playerSide: playerSideLabel,
          playerColor,
        })

        const data = await Promise.race([
          responsePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('hint_timeout')), 12000)
          ),
        ])
        if (requestId !== hintRequestSeqRef.current) return

        const payload =
          data && typeof data === 'object' && data.data && typeof data.data === 'object'
            ? data.data
            : data
        const hint = String(
          payload?.hint ||
            payload?.coachHint ||
            payload?.analysis?.hint ||
            payload?.aiCommentary ||
            payload?.message ||
            ''
        ).trim()
        if (!hint) {
          throw new Error('empty_hint')
        }

        setTacticalHint(`Bạn đang cầm quân ${playerSideLabel}. ${hint}`)
        setHintError('')
      } catch (error) {
        if (requestId !== hintRequestSeqRef.current) return
        const message =
          error?.message === 'hint_timeout'
            ? 'Phân tích đang chậm, bạn bấm "Xin gợi ý nhanh" để thử lại.'
            : 'Gia sư đang bận, thử lại sau.'
        setHintError(message)
        if (manual) {
          setTacticalHint((prev) =>
            prev && prev.trim().length > 0
              ? prev
              : `Bạn đang cầm quân ${playerSideLabel}. Ưu tiên an toàn vua, phát triển quân nhẹ và kiểm soát trung tâm.`
          )
        }
      } finally {
        if (requestId === hintRequestSeqRef.current) {
          setIsHintLoading(false)
        }
      }
    },
    [chess, gameState, isHintLoading, playerColor, playerSideLabel]
  )

  const handleRefreshHint = useCallback(() => {
    void requestTacticalHint({ manual: true })
  }, [requestTacticalHint])

  useEffect(() => {
    if (gameState !== 'InGame') return
    if (isBotThinking) return
    if (moveHistory.length < 1) return

    const botColor = playerColor === 'White' ? 'Black' : 'White'
    const lastMove = moveHistory[moveHistory.length - 1]
    if (!lastMove || lastMove.color !== botColor) return
    if (lastHintRequestedPlyRef.current === moveHistory.length) return

    lastHintRequestedPlyRef.current = moveHistory.length
    const timer = setTimeout(() => {
      void requestTacticalHint({ manual: false })
    }, 350)

    return () => clearTimeout(timer)
  }, [gameState, isBotThinking, moveHistory, playerColor, requestTacticalHint])

  // ── Navigate-away forfeit: block browser tab close/refresh ──
  const gameActive = gameState === 'InGame' || gameState === 'Paused'
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingLeavePath, setPendingLeavePath] = useState(null)
  useEffect(() => {
    if (!gameActive) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gameActive])

  useEffect(() => {
    if (!gameActive) return

    const handleDocumentNavigation = (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (href.startsWith('#') && !href.startsWith('#/')) return

      if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey) {
        return
      }

      let targetPath = null
      if (href.startsWith('#/')) {
        targetPath = href.slice(1)
      } else {
        const resolved = new URL(href, window.location.origin)
        if (resolved.origin !== window.location.origin) return
        targetPath = resolved.hash?.startsWith('#/')
          ? resolved.hash.slice(1)
          : `${resolved.pathname}${resolved.search}${resolved.hash}`
      }
      const currentPath = window.location.hash?.startsWith('#/')
        ? window.location.hash.slice(1)
        : `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (targetPath === currentPath) return

      event.preventDefault()
      event.stopPropagation()
      setPendingLeavePath(targetPath)
      setShowLeaveConfirm(true)
    }

    document.addEventListener('click', handleDocumentNavigation, true)
    return () => document.removeEventListener('click', handleDocumentNavigation, true)
  }, [gameActive])

  const handleLeaveRequest = () => {
    setPendingLeavePath('/bot')
    if (gameActive) {
      setShowLeaveConfirm(true)
    } else {
      navigate('/bot')
    }
  }

  const handleForfeitAndLeave = () => {
    // User requested: exiting an unfinished bot game should not be saved to history.
    const destination = pendingLeavePath || '/bot'
    abandonWithoutSaveRef.current = true
    setShowLeaveConfirm(false)
    setPendingLeavePath(null)
    navigate(destination)
  }

  if (!gameData)
    return (
      <div
        className={`min-h-screen flex items-center justify-center px-4 ${THEME.background.page}`}
      >
        <div
          className={`${THEME.background.card} ${THEME.rounded.lg} ${THEME.shadow.md} max-w-md w-full p-6 text-center border ${THEME.border.DEFAULT}`}
        >
          <div className="text-5xl mb-3">🤖</div>
          <h2 className={`text-xl font-bold ${THEME.text.primary} mb-2`}>Không tải được ván bot</h2>
          <p className={`${THEME.text.secondary} text-sm mb-5`}>
            Dữ liệu ván đấu không còn hợp lệ hoặc trang vừa được mở lại.
          </p>
          <Button onClick={() => navigate('/bot')} className="w-full">
            Quay lại chọn bot
          </Button>
        </div>
      </div>
    )

  const resultText = {
    WhiteWin: playerColor === 'White' ? '🏆 Bạn thắng!' : '😔 Bạn thua',
    BlackWin: playerColor === 'Black' ? '🏆 Bạn thắng!' : '😔 Bạn thua',
    Draw: '🤝 Hòa',
  }[gameResult]

  const isFinished = gameState === 'Finished' || gameState === 'Saved'
  const isPlayerTurn = gameState === 'InGame' && chess.turn() === playerColorCode && !isBotThinking
  const isCheck = chess.inCheck()

  const statusText = isFinished
    ? resultText
    : isBotThinking
      ? '🤖 Bot đang suy nghĩ...'
      : isCheck && isPlayerTurn
        ? '⚡ Bạn đang bị chiếu!'
        : isPlayerTurn
          ? '🟢 Lượt của bạn'
          : '⏳ Bot đang tính nước...'

  const statusColor = isFinished
    ? gameResult === 'Draw'
      ? 'bg-blue-50 text-blue-700'
      : (gameResult === 'WhiteWin') === (playerColor === 'White')
        ? 'bg-green-50 text-green-700'
        : 'bg-red-50 text-red-700'
    : isCheck && isPlayerTurn
      ? 'bg-red-50 text-red-600'
      : isPlayerTurn
        ? 'bg-green-50 text-green-700'
        : 'bg-gray-50 text-gray-500'

  return (
    <MainLayout>
      {/* Leave-game confirm dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bỏ trận?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Rời trang khi chưa kết thúc trận sẽ không lưu vào lịch sử.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false)
                  setPendingLeavePath(null)
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
              >
                Ở lại
              </button>
              <button
                onClick={handleForfeitAndLeave}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Rời không lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {isFinished && gameResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full mx-4 shadow-2xl border border-gray-200">
            <div className="text-5xl mb-4">
              {gameResult === 'Draw'
                ? '🤝'
                : (gameResult === 'WhiteWin') === (playerColor === 'White')
                  ? '🏆'
                  : '😔'}
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{resultText}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {gameState === 'Saved'
                ? 'Đã lưu vào lịch sử'
                : isSavingResult
                  ? 'Đang lưu kết quả...'
                  : 'Đang chốt kết quả...'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/bot')}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white"
              >
                Chơi Lại
              </button>
              <button
                onClick={() => navigate('/replays')}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
              >
                Xem Lịch Sử
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto px-2 sm:px-4 py-2">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeaveRequest}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title="Rời trận"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                Đấu với Bot
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-semibold ${difficultyBadgeClass}`}
                >
                  {difficultyLabel}
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-mono">
                {gameData.botPlayer?.username} · {difficultyLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Main area */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          {/* LEFT: Board column */}
          <div className="w-full flex-shrink-0">
            {/* Bot bar (top) */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 mb-1">
              <span className="text-2xl leading-none">🤖</span>
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 text-sm">
                  {gameData.botPlayer?.username}
                </span>
                <span className="text-xs text-gray-400 ml-2">~{gameData.botPlayer?.rating}</span>
                {isBotThinking && (
                  <span className="ml-2 text-xs text-yellow-600 animate-pulse font-medium">
                    Đang suy nghĩ...
                  </span>
                )}
              </div>
            </div>

            {/* Chess board */}
            <div
              className="w-full my-1"
              style={{ maxWidth: 'calc(100vh - 180px)', margin: '4px auto' }}
            >
              <ChessBoard
                gameState={chess}
                onMove={handleMove}
                playerColor={playerColor.toLowerCase()}
                disabled={
                  gameState !== 'InGame' || chess.turn() !== playerColorCode || isBotThinking
                }
                highlightCheck
                soundEnabled={false}
              />
            </div>

            {/* Human bar (bottom) */}
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border mt-1 transition-all duration-300 ${
                isPlayerTurn ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'
              }`}
            >
              <div className="relative">
                <Avatar
                  src={gameData.humanPlayer?.avatarUrl}
                  name={gameData.humanPlayer?.username}
                  size="sm"
                />
                {isPlayerTurn && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 text-sm">
                  {gameData.humanPlayer?.username}
                </span>
                <span className="text-xs text-gray-500 ml-1">({playerColor})</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Side panel */}
          <div
            className="w-full xl:w-[360px] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden xl:sticky xl:top-3"
            style={{ height: 'calc(100vh - 120px)', maxHeight: '820px' }}
          >
            {/* Status strip */}
            <div
              className={`px-4 py-2 text-sm font-semibold text-center border-b border-gray-200 ${statusColor}`}
            >
              {statusText}
            </div>

            {/* Tactical coach */}
            <div className="px-3 py-3 border-b border-gray-100 bg-amber-50/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Gia sư chiến thuật
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshHint}
                  disabled={isHintLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCcw className="w-3 h-3" />
                  {isHintLoading ? 'Đang phân tích...' : 'Xin gợi ý nhanh'}
                </button>
              </div>
              <div className="mt-2 rounded-lg border border-amber-100 bg-white p-2.5 text-sm text-gray-700 max-h-32 overflow-y-auto">
                {tacticalHint && tacticalHint.trim().length > 0
                  ? tacticalHint
                  : `Bạn đang cầm quân ${playerSideLabel}. Ưu tiên an toàn vua, phát triển quân nhẹ và kiểm soát trung tâm.`}
                {isHintLoading && (
                  <p className="mt-2 text-[11px] text-amber-600">Đang tổng hợp gợi ý chiến thuật...</p>
                )}
              </div>
              {hintError && <p className="mt-1 text-[11px] text-red-600">{hintError}</p>}
              <p className="mt-1 text-[11px] text-amber-700">
                Gợi ý theo yêu cầu, tập trung lưu ý chiến thuật và cạm bẫy, không đưa nước đi cụ
                thể.
              </p>
            </div>

            {/* Moves header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
              <List className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nước đi
              </span>
              <span className="text-xs text-gray-400 ml-auto">{moveHistory.length} nước</span>
            </div>

            {/* Move list */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <MoveListPanel moves={moveHistory} />
            </div>

            {/* Controls */}
            <div className="px-3 py-2 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleResign}
                disabled={isFinished || gameState === 'Paused' || isSavingResult}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  isFinished || gameState === 'Paused' || isSavingResult
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700'
                }`}
              >
                <Flag className="w-4 h-4" />
                Đầu hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
