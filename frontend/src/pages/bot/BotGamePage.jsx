import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ChessBoard } from '@components/game'
import { useNotification } from '@hooks'
import { botGameAPI } from '@services/gameService'
import { Loader, Avatar } from '@components/common'
import { MainLayout } from '@components/layout'
import { Flag, List, ArrowLeft, Trophy, Lightbulb, RefreshCcw } from 'lucide-react'
import { THEME } from '@/styles/theme'

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

  const pairs = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ n: Math.floor(i / 2) + 1, w: moves[i], b: moves[i + 1] || null, wi: i, bi: i + 1 })
  }

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
              {p.w?.san || ''}
            </span>
            {p.b ? (
              <span
                className={`flex-1 font-mono px-1.5 py-0.5 rounded ${
                  p.bi === moves.length - 1
                    ? 'bg-yellow-100 text-yellow-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.b.san}
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
  const { gameData, sessionId: sessionIdFromState } = location.state ?? {}
  const botSessionId = gameData?.sessionId ?? sessionIdFromState ?? null
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
  const [tacticalHint, setTacticalHint] = useState(
    'Gia sư chiến thuật sẽ đưa gợi ý khi ván đấu có đủ dữ liệu.'
  )
  const [isHintLoading, setIsHintLoading] = useState(false)
  const [hintError, setHintError] = useState('')

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

  const difficultyRaw = String(
    gameData?.config?.difficultyCode || gameData?.difficulty || gameData?.config?.difficulty || ''
  ).toLowerCase()

  const difficultyCode =
    difficultyRaw === 'expert' || difficultyRaw === 'hard' || difficultyRaw === 'advanced'
      ? difficultyRaw === 'expert'
        ? 'expert'
        : 'advanced'
      : difficultyRaw === 'medium' || difficultyRaw === 'intermediate'
        ? 'intermediate'
        : 'beginner'

  const difficultyLabel = {
    beginner: 'Easy',
    intermediate: 'Medium',
    advanced: 'Hard',
    expert: 'Expert',
  }[difficultyCode]

  const difficultyBadgeClass = {
    beginner: 'bg-green-100 text-green-700 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    advanced: 'bg-orange-100 text-orange-700 border-orange-200',
    expert: 'bg-red-100 text-red-700 border-red-200',
  }[difficultyCode]

  // Redirect nếu không có gameData
  useEffect(() => {
    if (!gameData) {
      showError('Không tìm thấy thông tin game')
      navigate('/bot')
      return
    }
    setGameState('InGame') // SM: Waiting → InGame
  }, [])

  // Nếu player chọn Black, bot (White) đi trước — trigger ngay khi vào game
  useEffect(() => {
    if (gameState === 'InGame' && chess.turn() !== playerColorCode) {
      executeBotMove(chess)
    }
  }, [gameState]) // chỉ chạy 1 lần khi gameState chuyển sang InGame

  // =============================================
  // CHECK END CONDITION
  // A1: "Check end condition (checkmate/stalemate/draw)"
  // =============================================
  const checkEndCondition = useCallback((chessInst) => {
    if (chessInst.isCheckmate()) {
      const winner = chessInst.turn() === 'w' ? 'Black' : 'White'
      setGameResult(winner === 'White' ? 'WhiteWin' : 'BlackWin')
      setGameState('Finished') // SM: InGame → Finished
      return true
    }
    if (chessInst.isStalemate() || chessInst.isDraw()) {
      setGameResult('Draw')
      setGameState('Finished')
      return true
    }
    return false
  }, [])

  // =============================================
  // AUTO-SAVE khi Finished (SM: Finished → Saved)
  // UC6: Save Game to History
  // =============================================
  useEffect(() => {
    if (gameState === 'Finished' && gameResult && !isSaved) {
      const derivedMoves = buildReplayMoves()
      const finalMoves = derivedMoves.length >= moveHistory.length ? derivedMoves : moveHistory
      const fallbackHuman = { username: 'You', isBot: false }
      const fallbackBot = { username: 'Bot', isBot: true }

      botGameAPI
        .saveBotGame(gameId, {
          result: gameResult,
          state: 'Saved',
          moves: finalMoves,
          mode: 'bot',
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
        .then(() => {
          setGameState('Saved') // SM: Finished → Saved
          setIsSaved(true)
          showSuccess('Ván đấu đã được lưu vào lịch sử')
        })
        .catch(() => showError('Không thể lưu ván đấu'))
    }
  }, [
    gameState,
    gameResult,
    isSaved,
    buildReplayMoves,
    moveHistory,
    gameId,
    gameData,
    playerColor,
    showSuccess,
    showError,
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
      setIsBotThinking(true)
      try {
        if (!botSessionId) {
          throw new Error('Missing bot session id')
        }
        const botResponse = await botGameAPI.getBotMove(botSessionId, chessInst.fen())
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
          throw new Error(`Illegal move from bot: ${uci}`)
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
        showError((error && error.message) || 'Bot gặp lỗi') // S1: 503/504
      } finally {
        setIsBotThinking(false)
      }
    },
    [botSessionId, checkEndCondition, showError, forceUpdate]
  )

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

  // UC4: Pause / Resume — SM: InGame ↔ Paused
  const handlePause = async () => {
    try {
      await botGameAPI.pauseBotGame(gameId)
      setGameState('Paused')
    } catch {
      showError('Không thể tạm dừng')
    }
  }
  const handleResume = async () => {
    try {
      await botGameAPI.resumeBotGame(gameId)
      setGameState('InGame')
    } catch {
      showError('Không thể tiếp tục')
    }
  }
  // Resign — SM: InGame → Finished
  const handleResign = () => {
    setGameResult(playerColor === 'White' ? 'BlackWin' : 'WhiteWin')
    setGameState('Finished')
  }

  const handleRefreshHint = async () => {
    if (gameState !== 'InGame' && gameState !== 'Paused') return

    const pgn = chess.pgn()
    if (!pgn || pgn.trim().length < 8) {
      setTacticalHint('Cần thêm vài nước đi nữa để đưa gợi ý chi tiết.')
      setHintError('')
      setIsHintLoading(false)
      return
    }

    setIsHintLoading(true)
    setHintError('')

    try {
      const data = await botGameAPI.getTacticalHint(pgn, 'detailed')
      const hint = String(data?.hint || '').trim()
      if (!hint) {
        throw new Error('empty hint')
      }
      setTacticalHint(hint)
    } catch {
      setHintError('Gia sư đang bận, thử lại sau.')
    } finally {
      setIsHintLoading(false)
    }
  }

  // ── Navigate-away forfeit: block browser tab close/refresh ──
  const gameActive = gameState === 'InGame' || gameState === 'Paused'
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  useEffect(() => {
    if (!gameActive) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gameActive])

  const handleLeaveRequest = () => {
    if (gameActive) {
      setShowLeaveConfirm(true)
    } else {
      navigate('/bot')
    }
  }

  const handleForfeitAndLeave = () => {
    // User requested: exiting an unfinished bot game should not be saved to history.
    setShowLeaveConfirm(false)
    navigate('/bot')
  }

  if (!gameData)
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.background.page}`}>
        <Loader size="lg" />
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
                onClick={() => setShowLeaveConfirm(false)}
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
              {gameState === 'Saved' ? 'Đã lưu vào lịch sử' : 'Đang lưu...'}
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
                  {isHintLoading ? 'Đang phân tích...' : 'Xin gợi ý chi tiết'}
                </button>
              </div>
              <div className="mt-2 rounded-lg border border-amber-100 bg-white p-2.5 text-sm text-gray-700 max-h-32 overflow-y-auto">
                {isHintLoading ? 'Đang tổng hợp gợi ý chiến thuật...' : hintError || tacticalHint}
              </div>
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
                disabled={isFinished || gameState === 'Paused'}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  isFinished || gameState === 'Paused'
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
