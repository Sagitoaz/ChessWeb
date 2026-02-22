import React from 'react'
import { useParams } from 'react-router-dom'

export default function RoomGamePage() {
  const { roomId } = useParams()
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Phòng chơi: {roomId}</h1>
      <p className="text-sm text-gray-600">Game UI sẽ được nhúng ở đây (chessboard, chat, players).</p>
    </div>
  )
}
