import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ChessBoard, MoveHistory } from '@components/game'
import { useReplayControls } from '@hooks'
import { replayAPI } from '@services/gameService'
import { useNotification } from '@hooks'
import { Loader } from '@components/common'

export default function ReplayViewerPage() {
  const navigate = useNavigate()
  const { gameId } = useParams()
  const { error: showError } = useNotification()

  const [gameData, setGameData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // S2_LoadReplay.puml: GET /games/{gameId} với full error handling
  useEffect(() => {
    if (!gameId) return
    setIsLoading(true)
    setLoadError(null)

    replayAPI
      .getGame(gameId)
      .then((data) => {
        // S2: validate state === 'Saved'
        if (data.state !== 'Saved') {
          setLoadError('Replay không khả dụng cho ván đấu này')
          return
        }
        // S2: validate FEN
        if (!data.initialFEN) {
          setLoadError('Dữ liệu bị lỗi: FEN không hợp lệ')
          return
        }
        // S2: validate moves
        if (!data.moves || data.moves.length === 0) {
          setLoadError('Không có nước đi để replay')
          return
        }
        // S2: Session created → initReplay
        setGameData(data)
      })
      .catch((err) => {
        // S2 error cases
        const msgs = {
          400: 'ID ván đấu không hợp lệ',
          401: 'Bạn cần đăng nhập',
          403: 'Không có quyền xem ván đấu này',
          404: 'Không tìm thấy ván đấu',
          429: 'Quá nhiều yêu cầu, thử lại sau',
          503: 'Dịch vụ tạm thời không khả dụng',
          504: 'Timeout, vui lòng thử lại',
        }
        setLoadError(msgs[err.status] ?? 'Không thể tải ván đấu')
      })
      .finally(() => setIsLoading(false))
  }, [gameId])

  // useReplayControls = implementation của ReplaySession (Class_BotReplayModule.puml)
  const {
    cursor,
    currentFEN,
    currentMove,
    moves,
    progress,
    error: replayError,
    stepForward,
    stepBackward,
    jumpTo,
    reset,
    canStepForward,
    canStepBackward,
    totalMoves,
    currentMoveNumber,
    isAtStart,
    isAtEnd,
  } = useReplayControls(gameData)

  // ChessBoard expects a Chess instance (gameState prop), not a FEN string.
  const chessForDisplay = useMemo(() => {
    try {
      return new Chess(currentFEN)
    } catch {
      return new Chess()
    }
  }, [currentFEN])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') stepForward()
      if (e.key === 'ArrowLeft') stepBackward()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepForward, stepBackward])

  // A2: "Exit → return to History"
  const handleExit = () => navigate('/replays')

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader size="lg" text="Đang tải replay..." />
      </div>
    )

  if (loadError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-400 text-lg mb-6">{loadError}</p>
          <button
            onClick={handleExit}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            ← Quay lại Lịch Sử
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-900 text-white py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={handleExit}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-2"
            >
              ← Lịch sử
            </button>
            <h1 className="text-xl font-bold">
              {gameData?.whitePlayer?.username} vs {gameData?.blackPlayer?.username}
            </h1>
            {gameData?.metadata?.opening && (
              <p className="text-gray-400 text-sm">{gameData.metadata.opening}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>
              Nước {currentMoveNumber} / {totalMoves}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Black player */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span>⬛</span>
              <span className="font-medium">{gameData?.blackPlayer?.username}</span>
              {gameData?.blackPlayer?.isBot && <span className="text-xs text-gray-500">🤖</span>}
            </div>

            {/* Board — disabled (replay mode) */}
            <ChessBoard
              gameState={chessForDisplay}
              onMove={() => false}
              disabled={true}
              playerColor="white"
            />

            {/* White player */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <span>⬜</span>
              <span className="font-medium">{gameData?.whitePlayer?.username}</span>
              {gameData?.whitePlayer?.isBot && <span className="text-xs text-gray-500">🤖</span>}
            </div>

            {/* Progress bar — ReplaySession.getProgress() */}
            <div className="mt-4 bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Navigation — A2_ReplayFlow.puml: Next / Prev / Jump */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {/* reset() */}
              <button
                onClick={reset}
                disabled={isAtStart}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-lg"
                title="Về đầu"
              >
                ⏮
              </button>

              {/* UC9: Step Backward */}
              <button
                onClick={stepBackward}
                disabled={!canStepBackward}
                className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xl"
                title="← Prev"
              >
                ◀
              </button>

              <span className="px-4 py-2 bg-gray-800 rounded-lg text-sm min-w-[80px] text-center">
                {isAtStart ? 'Đầu' : `${currentMoveNumber} / ${totalMoves}`}
              </span>

              {/* UC8: Step Forward */}
              <button
                onClick={stepForward}
                disabled={!canStepForward}
                className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xl"
                title="→ Next"
              >
                ▶
              </button>

              {/* jumpTo(lastIndex) */}
              <button
                onClick={() => jumpTo(moves.length - 1)}
                disabled={isAtEnd}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-lg"
                title="Về cuối"
              >
                ⏭
              </button>
            </div>

            {currentMove && (
              <div className="mt-3 text-center text-sm text-gray-400">
                Nước {currentMove.ply}: <strong>{currentMove.san}</strong>
                {currentMove.isCheck && !currentMove.isCheckmate && ' +'}
                {currentMove.isCheckmate && ' # (Chiếu hết)'}
              </div>
            )}
            <p className="text-center text-xs text-gray-600 mt-2">Phím ← → để điều hướng</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Lịch Sử Nước Đi
            </h3>
            {/* onMoveClick = ReplaySession.jumpTo(moveIndex) */}
            <MoveHistory
              moves={moves}
              currentMoveIndex={cursor}
              onMoveClick={(idx) => jumpTo(idx)}
              highlightLastMove={true}
            />

            {gameData?.result && gameData.result !== 'Ongoing' && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg text-center">
                <p className="text-sm text-gray-400 mb-1">Kết quả</p>
                <p className="font-bold">
                  {gameData.result === 'WhiteWin' && '⬜ Trắng thắng'}
                  {gameData.result === 'BlackWin' && '⬛ Đen thắng'}
                  {gameData.result === 'Draw' && '🤝 Hòa'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
