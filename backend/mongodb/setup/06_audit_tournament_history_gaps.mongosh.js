// Audit tournament games that look finished but still miss replay/result fields.
// Usage:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/06_audit_tournament_history_gaps.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

const query = {
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
}

const rows = appDb.games
  .find(query, {
    projection: {
      _id: 1,
      mode: 1,
      tournamentId: 1,
      tournamentMatchId: 1,
      whitePlayerId: 1,
      blackPlayerId: 1,
      result: 1,
      rawResult: 1,
      endReason: 1,
      status: 1,
      state: 1,
      createdAt: 1,
      finishedAt: 1,
    },
  })
  .sort({ finishedAt: -1, _id: -1 })
  .toArray()

print(`[audit-tournament-history-gaps] records: ${rows.length}`)
rows.slice(0, 100).forEach((row, index) => {
  printjson({
    index: index + 1,
    gameId: String(row._id),
    tournamentId: row.tournamentId || null,
    tournamentMatchId: row.tournamentMatchId || null,
    result: row.result ?? null,
    rawResult: row.rawResult ?? null,
    endReason: row.endReason ?? null,
    status: row.status ?? null,
    state: row.state ?? null,
    finishedAt: row.finishedAt ?? null,
  })
})

if (rows.length > 100) {
  print(`[audit-tournament-history-gaps] truncated output to first 100 rows`)
}
