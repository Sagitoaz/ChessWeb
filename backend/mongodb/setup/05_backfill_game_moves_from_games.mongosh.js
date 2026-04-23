// Backfill game_moves from embedded games.moves.
// Safe to run multiple times: it replaces rows for each processed gameId.
// Usage:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/05_backfill_game_moves_from_games.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

const games = appDb.games
  .find(
    {
      moves: { $type: 'array' },
      $expr: { $gt: [{ $size: '$moves' }, 0] },
    },
    {
      projection: {
        _id: 1,
        moves: 1,
        updatedAt: 1,
      },
    }
  )
  .toArray()

let totalInserted = 0

games.forEach((game) => {
  const gameId = String(game._id)
  const moves = Array.isArray(game.moves) ? game.moves : []
  const now = game.updatedAt instanceof Date ? game.updatedAt : new Date()

  appDb.game_moves.deleteMany({ gameId })

  if (moves.length === 0) return

  const docs = moves.map((move, index) => ({
    gameId,
    ply: Number.isFinite(move?.ply) ? Number(move.ply) : index + 1,
    san: typeof move?.san === 'string' ? move.san : null,
    uci: typeof move?.uci === 'string' ? move.uci : null,
    from: typeof move?.from === 'string' ? move.from : null,
    to: typeof move?.to === 'string' ? move.to : null,
    piece: typeof move?.piece === 'string' ? move.piece : null,
    color: typeof move?.color === 'string' ? move.color : null,
    captured: typeof move?.captured === 'string' ? move.captured : null,
    promotion: typeof move?.promotion === 'string' ? move.promotion : null,
    isCheck: Boolean(move?.isCheck),
    isCheckmate: Boolean(move?.isCheckmate),
    timestamp: typeof move?.timestamp === 'string' ? move.timestamp : now.toISOString(),
    rawMove: move,
    createdAt: now,
    updatedAt: now,
  }))

  const result = appDb.game_moves.insertMany(docs, { ordered: true })
  totalInserted += Object.keys(result.insertedIds || {}).length
})

print(`[backfill-game-moves] games processed: ${games.length}`)
print(`[backfill-game-moves] moves inserted: ${totalInserted}`)
