import React from 'react'
import { useParams } from 'react-router-dom'

export default function TournamentBracketPage() {
  const { tournamentId } = useParams()
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Bracket: {tournamentId}</h1>
      <p className="text-sm text-gray-600">Bracket visualization / bracket editor placeholder.</p>
    </div>
  )
}
