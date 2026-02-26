import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ChessBoard, MoveHistory, GameControls, GameStatus } from '@components/game'
import { useNotification } from '@hooks'
import { botGameAPI } from '@services/gameService'
import { Loader } from '@components/common'

export default function BotGamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { gameId } = useParams()
  const { error: showError, success: showSuccess } = useNotification()

  // Nhận gameData từ BotSelectPage qua navigation state
  const { gameData } = location.state ?? {}
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

  const playerColor = gameData?.playerColor ?? 'White'
  const playerColorCode = playerColor === 'White' ? 'w' : 'b'

  // Redirect nếu không có gameData
  useEffect(() => {
    if (!gameData) {
      showError('Không tìm thấy thông tin game')
      navigate('/bot')
      return
    }
    setGameState('InGame') // SM: Waiting → InGame
  }, [])

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
      botGameAPI
        .saveBotGame(gameId, {
          result: gameResult,
          moves: moveHistory,
          mode: 'HumanVsBot',
        })
        .then(() => {
          setGameState('Saved') // SM: Finished → Saved
          setIsSaved(true)
          showSuccess('Ván đấu đã được lưu vào lịch sử')
        })
        .catch(() => showError('Không thể lưu ván đấu'))
    }
  }, [gameState, gameResult, isSaved])

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
        const legalMoves = chessInst.moves({ verbose: true })
        if (legalMoves.length === 0) return
        // Simulate BotConfig.timeLimitMs
        await new Promise((r) =>
          setTimeout(r, Math.min(gameData?.config?.timeLimitMs ?? 500, 1500))
        )
        const m = legalMoves[Math.floor(Math.random() * legalMoves.length)]
        const result = chessInst.move(m)
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
              color: 'Black',
              isCheck: chessInst.inCheck(),
              isCheckmate: chessInst.isCheckmate(),
              timestamp: new Date().toISOString(),
            },
          ])
          checkEndCondition(chessInst)
        }
      } catch {
        showError('Bot gặp lỗi') // S1: 503/504
      } finally {
        setIsBotThinking(false)
      }
    },
    [gameData?.config?.timeLimitMs, checkEndCondition, showError, forceUpdate]
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
          color: 'White',
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

  if (!gameData)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader size="lg" />
      </div>
    )

  const resultText = {
    WhiteWin: playerColor === 'White' ? '🏆 Bạn thắng!' : '😔 Bạn thua',
    BlackWin: playerColor === 'Black' ? '🏆 Bạn thắng!' : '😔 Bạn thua',
    Draw: '🤝 Hòa',
  }[gameResult]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Result Modal */}
        {(gameState === 'Finished' || gameState === 'Saved') && gameResult && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm">
              <div className="text-5xl mb-4">
                {gameResult === 'Draw'
                  ? '🤝'
                  : gameResult.startsWith(playerColor.slice(0, 5))
                    ? '🏆'
                    : '😔'}
              </div>
              <h2 className="text-2xl font-bold mb-2">{resultText}</h2>
              <p className="text-gray-400 mb-6">
                {gameState === 'Saved' ? 'Đã lưu vào lịch sử' : 'Đang lưu...'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/bot')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold"
                >
                  Chơi Lại
                </button>
                <button
                  onClick={() => navigate('/replays')}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  Xem Lịch Sử
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Bot header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="font-semibold">{gameData.botPlayer?.username}</p>
                <p className="text-xs text-gray-400">
                  ~{gameData.botPlayer?.rating} rating
                  {isBotThinking && (
                    <span className="ml-2 text-yellow-400 animate-pulse">Đang suy nghĩ...</span>
                  )}
                </p>
              </div>
            </div>

            <ChessBoard
              gameState={chess}
              onMove={handleMove}
              playerColor={playerColor.toLowerCase()}
              disabled={gameState !== 'InGame' || chess.turn() !== playerColorCode || isBotThinking}
            />

            {/* Human footer */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-2xl">👤</span>
              <p className="font-semibold">
                {gameData.humanPlayer?.username} ({playerColor})
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <GameStatus
              gameState={chess}
              currentTurn={chess.turn() === 'w' ? 'White' : 'Black'}
              playerColor={playerColor}
              status={
                chess.isCheckmate()
                  ? { type: 'checkmate', message: '' }
                  : chess.isStalemate()
                    ? { type: 'stalemate', message: '' }
                    : chess.isDraw()
                      ? { type: 'draw', message: '' }
                      : chess.inCheck()
                        ? { type: 'check', message: '' }
                        : { type: 'playing', message: '' }
              }
            />
            <GameControls
              onResign={handleResign}
              onPause={handlePause}
              onResume={handleResume}
              showPause={true}
              isPaused={gameState === 'Paused'}
              disabled={gameState === 'Finished' || gameState === 'Saved'}
            />
            <MoveHistory
              moves={moveHistory}
              currentMoveIndex={moveHistory.length - 1}
              highlightLastMove={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
