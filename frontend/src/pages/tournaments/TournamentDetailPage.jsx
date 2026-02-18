import React from 'react'
import { useParams } from 'react-router-dom'

export default function TournamentDetailPage() {
  const { tournamentId } = useParams()
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Chi tiết giải đấu: {tournamentId}</h1>
      <p className="text-sm text-gray-600">Thông tin giải đấu và lịch thi đấu sẽ hiện ở đây.</p>
    </div>
  )
}
