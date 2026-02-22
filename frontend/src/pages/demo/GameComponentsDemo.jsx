import { useState } from 'react'
import { ChessGame } from '@/utils/chessLogic'
import {
  ChessBoard,
  MoveHistory,
  GameClock,
  GameControls,
  GameChat,
  GameStatus,
} from '@/components/game'

const GameComponentsDemo = () => {
  const [game, setGame] = useState(new ChessGame())
  const [moves, setMoves] = useState([])
  const [messages, setMessages] = useState([])
  const [whiteTime] = useState(600000) // 10 min
  const [blackTime] = useState(600000)
  const [currentTurn, setCurrentTurn] = useState('white')
  const [isPaused, setIsPaused] = useState(false)

  const handleMove = (move) => {
    setMoves((prev) => [...prev, move])
    setCurrentTurn(game.turn() === 'w' ? 'white' : 'black')
    setGame(new ChessGame(game.fen())) // Force re-render
  }

  const handleSendMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        userId: 'player1',
        username: 'You',
        text,
        timestamp: Date.now(),
        type: 'user',
      },
    ])
  }

  const handleResign = () => {
    alert('Game resigned!')
  }

  const handleOfferDraw = () => {
    alert('Draw offered!')
  }

  const getGameStatus = () => {
    if (game.isCheckmate()) {
      return { type: 'checkmate', message: 'Checkmate!' }
    }
    if (game.inCheck()) {
      return { type: 'check', message: 'Check!' }
    }
    if (game.isStalemate()) {
      return { type: 'stalemate', message: 'Stalemate!' }
    }
    if (game.isDraw()) {
      return { type: 'draw', message: 'Draw!' }
    }
    return { type: 'playing', message: '' }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Game Components Demo
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Board */}
          <div className="lg:col-span-2 space-y-4">
            {/* Opponent Clock */}
            <GameClock
              initialTime={blackTime}
              isRunning={currentTurn === 'black' && !isPaused}
              isMySide={false}
            />

            {/* Board */}
            <ChessBoard
              gameState={game}
              onMove={handleMove}
              playerColor="white"
              disabled={isPaused}
            />

            {/* Player Clock */}
            <GameClock
              initialTime={whiteTime}
              isRunning={currentTurn === 'white' && !isPaused}
              isMySide={true}
            />

            {/* Status */}
            <GameStatus
              gameState={game}
              currentTurn={currentTurn}
              playerColor="white"
              status={getGameStatus()}
            />

            {/* Controls */}
            <GameControls
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onPause={() => setIsPaused(true)}
              onResume={() => setIsPaused(false)}
              showPause={true}
              isPaused={isPaused}
            />
          </div>

          {/* Right Column - History & Chat */}
          <div className="space-y-4">
            {/* Move History */}
            <div className="h-64">
              <MoveHistory moves={moves} currentMoveIndex={moves.length - 1} />
            </div>

            {/* Chat */}
            <div className="h-96">
              <GameChat
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUserId="player1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameComponentsDemo
