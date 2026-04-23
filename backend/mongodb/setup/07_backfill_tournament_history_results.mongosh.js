// Backfill missing result/rawResult/endReason for finished tournament games
// using tournament bracket data from tournaments.rounds.
//
// Safe behavior:
// - Only touches mode='tournament' games with finishedAt already set
// - Only fills missing fields; does not overwrite valid existing values
// - Skips unresolved/double_forfeit matches unless they can be mapped confidently
//
// Usage:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/07_backfill_tournament_history_results.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

const tournaments = appDb.tournaments
  .find(
    {
      rounds: { $type: 'array' },
      $expr: { $gt: [{ $size: '$rounds' }, 0] },
    },
    {
      projection: {
        _id: 1,
        rounds: 1,
      },
    }
  )
  .toArray()

const bracketByGameId = new Map()

tournaments.forEach((tournament) => {
  const tournamentId = String(tournament._id)
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : []

  rounds.forEach((round, roundIndex) => {
    const matches = Array.isArray(round?.matches) ? round.matches : []
    matches.forEach((match, matchIndex) => {
      const gameId = typeof match?.gameId === 'string' ? match.gameId : ''
      if (!gameId) return

      bracketByGameId.set(gameId, {
        tournamentId,
        roundIndex,
        matchIndex,
        matchId: typeof match?.id === 'string' ? match.id : null,
        result: typeof match?.result === 'string' ? match.result : null,
        winner: typeof match?.winner === 'string' ? match.winner : null,
        status: typeof match?.status === 'string' ? match.status : null,
      })
    })
  })
})

const targetGames = appDb.games
  .find(
    {
      mode: 'tournament',
      finishedAt: { $exists: true, $ne: null },
      $or: [
        { result: { $exists: false } },
        { result: null },
        { result: '' },
        { rawResult: { $exists: false } },
        { rawResult: null },
        { rawResult: '' },
        { endReason: { $exists: false } },
        { endReason: null },
        { endReason: '' },
      ],
    },
    {
      projection: {
        _id: 1,
        result: 1,
        rawResult: 1,
        endReason: 1,
        status: 1,
        state: 1,
        finishedAt: 1,
      },
    }
  )
  .toArray()

let matched = 0
let modified = 0
let skipped = 0

targetGames.forEach((game) => {
  const gameId = String(game._id)
  const bracket = bracketByGameId.get(gameId)

  if (!bracket || !bracket.result) {
    skipped += 1
    return
  }

  const updateSet = {
    updatedAt: new Date(),
  }

  if (!game.status) {
    updateSet.status =
      bracket.result === 'double_forfeit' ? 'cancelled' : 'finished'
  }

  if (!game.state) {
    updateSet.state = 'Saved'
  }

  if (!game.result) {
    if (bracket.result === '1-0') updateSet.result = 'white_win'
    else if (bracket.result === '0-1') updateSet.result = 'black_win'
    else if (bracket.result === 'double_forfeit') updateSet.result = 'double_forfeit'
  }

  if (!game.rawResult) {
    if (
      bracket.result === '1-0' ||
      bracket.result === '0-1' ||
      bracket.result === 'double_forfeit'
    ) {
      updateSet.rawResult = bracket.result
    }
  }

  if (!game.endReason) {
    if (bracket.result === 'double_forfeit') {
      updateSet.endReason = 'double_no_show'
    } else {
      updateSet.endReason = 'tournament_result_recorded'
    }
  }

  const keys = Object.keys(updateSet)
  if (keys.length <= 1) {
    skipped += 1
    return
  }

  matched += 1
  const result = appDb.games.updateOne(
    { _id: game._id },
    {
      $set: updateSet,
    }
  )

  if (result.modifiedCount > 0) {
    modified += 1
  }
})

print(`[backfill-tournament-history] indexed bracket games: ${bracketByGameId.size}`)
print(`[backfill-tournament-history] candidate games: ${targetGames.length}`)
print(`[backfill-tournament-history] matched: ${matched}`)
print(`[backfill-tournament-history] modified: ${modified}`)
print(`[backfill-tournament-history] skipped: ${skipped}`)
