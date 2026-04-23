import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ChessBoard, MoveHistory } from '@components/game'
import { useReplayControls } from '@hooks'
import { replayAPI } from '@services/gameService'
import { Loader } from '@components/common'
import { THEME } from '@/styles/theme'
import { getMoveLabel } from '@/utils/moveNotation'
import { getUserDisplayName } from '@/utils/userDisplay'
import { useAuthStore } from '@/store'

const getReplayPlayer = (gameData, color) => {
  const player = color === 'white' ? gameData?.whitePlayer : gameData?.blackPlayer
  const playerId = color === 'white' ? gameData?.whitePlayerId : gameData?.blackPlayerId
  const isBot = Boolean(player?.isBot) || playerId === 'bot'
  const fallbackName = isBot ? 'Bot' : color === 'white' ? 'Trắng' : 'Đen'

  return {
    username:
      getUserDisplayName(player, '') ||
      (typeof playerId === 'string' && playerId.trim() && playerId !== 'bot' ? playerId : '') ||
      fallbackName,
    rating: typeof player?.rating === 'number' ? player.rating : null,
    avatarUrl: typeof player?.avatarUrl === 'string' ? player.avatarUrl : null,
    isBot,
  }
}

export default function ReplayViewerPage() {
  const navigate = useNavigate()
  const { gameId } = useParams()
  const authUser = useAuthStore((state) => state.user)

  const [gameData, setGameData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [aiCommentary, setAiCommentary] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiRetryTick, setAiRetryTick] = useState(0)
  const aiCommentaryCacheRef = useRef(new Map())
  const forceAiRefreshRef = useRef(false)
  const aiFallback = 'AI đang bận, vui lòng phân tích lại sau'

  // S2_LoadReplay.puml: GET /games/{gameId} với full error handling
  useEffect(() => {
    if (!gameId) return
    setIsLoading(true)
    setLoadError(null)

    replayAPI
      .getGame(gameId)
      .then((data) => {
        // Accept both Saved and Finished snapshots.
        const state = String(data.state || '').toLowerCase()
        if (state !== 'saved' && state !== 'finished') {
          setLoadError('Replay không khả dụng cho ván đấu này')
          return
        }
        // S2: validate FEN
        if (!data.initialFEN) {
          setLoadError('Dữ liệu bị lỗi: FEN không hợp lệ')
          return
        }
        // S2: validate moves
        if (!Array.isArray(data.moves) || data.moves.length === 0) {
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
  const whitePlayer = useMemo(() => getReplayPlayer(gameData, 'white'), [gameData])
  const blackPlayer = useMemo(() => getReplayPlayer(gameData, 'black'), [gameData])
  const viewerColor = useMemo(() => {
    const authUserId = String(
      authUser?.id || authUser?._id || authUser?.userId || authUser?.sub || ''
    ).trim()

    if (authUserId) {
      if (String(gameData?.whitePlayerId || '').trim() === authUserId) return 'white'
      if (String(gameData?.blackPlayerId || '').trim() === authUserId) return 'black'
    }

    if (whitePlayer.isBot && !blackPlayer.isBot) return 'black'
    if (blackPlayer.isBot && !whitePlayer.isBot) return 'white'
    return 'white'
  }, [authUser, gameData, whitePlayer.isBot, blackPlayer.isBot])

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

  const handleRetryAi = () => {
    forceAiRefreshRef.current = true
    setAiRetryTick((prev) => prev + 1)
  }

  useEffect(() => {
    if (!gameId || !currentMove || !currentFEN) {
      setAiCommentary('')
      setAiAnalysis(null)
      setIsAnalyzing(false)
      return
    }

    const currentMoveLabel =
      currentMove?.san || currentMove?.uci || getMoveLabel(currentMove) || `${currentMove.from}-${currentMove.to}`
    const cacheKey = `${gameId}::${viewerColor}::${currentFEN}::${currentMoveLabel}`
    const forceRefresh = forceAiRefreshRef.current
    forceAiRefreshRef.current = false

    if (!forceRefresh) {
      const cached = aiCommentaryCacheRef.current.get(cacheKey)
      if (cached) {
        setAiCommentary(cached.commentary)
        setAiAnalysis(cached.analysis || null)
        setIsAnalyzing(false)
        return
      }
    }

    let active = true
    setIsAnalyzing(true)

    const timer = setTimeout(() => {
      replayAPI
        .getGame(gameId, {
          fen: currentFEN,
          userMove: currentMoveLabel,
          score: 0,
          refreshAi: forceRefresh,
          playerColor: viewerColor,
        })
        .then((data) => {
          if (!active) return
          const commentary = data?.aiCommentary || aiFallback
          const analysis = data?.analysis || null
          if (commentary !== aiFallback) {
            aiCommentaryCacheRef.current.set(cacheKey, {
              commentary,
              analysis,
            })
          }
          setAiCommentary(commentary)
          setAiAnalysis(analysis)
        })
        .catch(() => {
          if (!active) return
          setAiCommentary(aiFallback)
          setAiAnalysis(null)
        })
        .finally(() => {
          if (!active) return
          setIsAnalyzing(false)
        })
    }, 220)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [gameId, currentFEN, currentMove, aiRetryTick, viewerColor])

  if (isLoading)
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.background.page}`}>
        <Loader size="lg" text="Đang tải replay..." />
      </div>
    )

  if (loadError)
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.background.page}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg mb-6">{loadError}</p>
          <button
            onClick={handleExit}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ← Quay lại Lịch Sử
          </button>
        </div>
      </div>
    )

  return (
    <div className={`min-h-screen ${THEME.background.page} ${THEME.text.primary} py-6 px-4`}>
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
              {whitePlayer.username} vs {blackPlayer.username}
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
              <span className="font-medium">{blackPlayer.username}</span>
              {blackPlayer.isBot && <span className="text-xs text-gray-500">🤖</span>}
              {blackPlayer.rating ? <span className="text-xs text-gray-500">{blackPlayer.rating}</span> : null}
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
              <span className="font-medium">{whitePlayer.username}</span>
              {whitePlayer.isBot && <span className="text-xs text-gray-500">🤖</span>}
              {whitePlayer.rating ? <span className="text-xs text-gray-500">{whitePlayer.rating}</span> : null}
            </div>

            {/* Progress bar — ReplaySession.getProgress() */}
            <div className="mt-4 bg-gray-200 rounded-full h-2">
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
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-lg"
                title="Về đầu"
              >
                ⏮
              </button>

              {/* UC9: Step Backward */}
              <button
                onClick={stepBackward}
                disabled={!canStepBackward}
                className="p-3 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-xl"
                title="← Prev"
              >
                ◀
              </button>

              <span className="px-4 py-2 bg-gray-200 rounded-lg text-sm min-w-[80px] text-center">
                {isAtStart ? 'Đầu' : `${currentMoveNumber} / ${totalMoves}`}
              </span>

              {/* UC8: Step Forward */}
              <button
                onClick={stepForward}
                disabled={!canStepForward}
                className="p-3 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-xl"
                title="→ Next"
              >
                ▶
              </button>

              {/* jumpTo(lastIndex) */}
              <button
                onClick={() => jumpTo(moves.length - 1)}
                disabled={isAtEnd}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-lg"
                title="Về cuối"
              >
                ⏭
              </button>
            </div>

            {currentMove && (
              <div className={`mt-3 text-center text-sm ${THEME.text.secondary}`}>
                Nước {currentMove.ply}: <strong>{getMoveLabel(currentMove) || '-'}</strong>
                {currentMove.isCheck && !currentMove.isCheckmate && ' +'}
                {currentMove.isCheckmate && ' # (Chiếu hết)'}
              </div>
            )}
            {currentMove && (
              <div
                className={`mt-3 p-3 rounded-lg border ${THEME.border.DEFAULT} ${THEME.background.card}`}
              >
                <p className={`text-xs uppercase tracking-wider mb-1 ${THEME.text.muted}`}>
                  Đại kiện tướng AI phân tích
                </p>
                <p className={`text-[11px] ${THEME.text.secondary} mb-1`}>
                  Góc nhìn: {viewerColor === 'white' ? 'Trắng' : 'Đen'}
                </p>
                <p className={`text-[11px] ${THEME.text.secondary} mb-2`}>
                  Nước đang xét: {currentMove.color === 'w' ? 'Trắng' : 'Đen'} đi
                </p>
                <p className={`text-sm ${THEME.text.primary}`}>
                  {isAnalyzing ? 'Đang phân tích nước đi...' : aiCommentary || aiFallback}
                </p>
                {aiAnalysis?.stockfishBestMove && aiAnalysis.stockfishBestMove !== 'N/A' && (
                  <p className={`mt-2 text-xs ${THEME.text.secondary}`}>
                    Stockfish gợi ý: <strong>{aiAnalysis.stockfishBestMove}</strong>
                  </p>
                )}
                {aiAnalysis?.stockfishBestMove === 'N/A' && (
                  <p className={`mt-2 text-xs ${THEME.text.secondary}`}>
                    Stockfish hiện chưa trả về nước ứng viên cho vị trí này.
                  </p>
                )}
                {!isAnalyzing && (aiCommentary || aiFallback) === aiFallback && (
                  <button
                    type="button"
                    onClick={handleRetryAi}
                    className="mt-2 text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Thử lại AI
                  </button>
                )}
              </div>
            )}
            <p className={`text-center text-xs ${THEME.text.muted} mt-2`}>Phím ← → để điều hướng</p>
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
              <div
                className={`mt-4 p-3 ${THEME.background.card} rounded-lg text-center border ${THEME.border.DEFAULT}`}
              >
                <p className={`text-sm ${THEME.text.secondary} mb-1`}>Kết quả</p>
                <p className={`font-bold ${THEME.text.primary}`}>
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
