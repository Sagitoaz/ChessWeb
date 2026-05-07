// MongoDB v2 canonical collections.
// Principle: each fact has one owner collection.

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)
const numericTypes = ['int', 'long', 'double', 'decimal']

function ensureCollection(name, validator = null) {
  const exists = appDb.getCollectionNames().includes(name)
  if (exists) {
    if (validator) {
      appDb.runCommand({
        collMod: name,
        validator: { $jsonSchema: validator },
        validationLevel: 'strict',
        validationAction: 'error'
      })
    }
    return
  }

  const options = validator
    ? { validator: { $jsonSchema: validator }, validationLevel: 'strict', validationAction: 'error' }
    : {}

  appDb.createCollection(name, options)
}

ensureCollection('users', {
  bsonType: 'object',
  required: ['_id', 'username', 'role', 'status', 'createdAt', 'updatedAt'],
  additionalProperties: true,
  properties: {
    _id: { bsonType: 'string' },
    username: { bsonType: 'string' },
    email: { bsonType: ['string', 'null'] },
    googleId: { bsonType: ['string', 'null'] },
    passwordHash: { bsonType: ['string', 'null'] },
    displayName: { bsonType: ['string', 'null'] },
    avatarUrl: { bsonType: ['string', 'null'] },
    avatarPublicId: { bsonType: ['string', 'null'] },
    role: { enum: ['USER', 'MOD', 'ADMIN', 'user', 'mod', 'admin'] },
    status: { enum: ['active', 'disabled', 'pending_verification'] },
    emailVerifiedAt: { bsonType: ['date', 'null'] },
    settings: { bsonType: ['object', 'null'] },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
})

ensureCollection('auth_sessions')
ensureCollection('auth_tokens')

ensureCollection('player_ratings', {
  bsonType: 'object',
  required: ['_id', 'userId', 'mode', 'rating', 'peakRating', 'createdAt', 'updatedAt'],
  additionalProperties: true,
  properties: {
    _id: { bsonType: 'string' },
    userId: { bsonType: 'string' },
    mode: { enum: ['ranked', 'rapid', 'blitz', 'bullet', 'bot', 'tournament'] },
    rating: { bsonType: numericTypes },
    peakRating: { bsonType: numericTypes },
    gamesPlayed: { bsonType: numericTypes },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
})

ensureCollection('rating_events')
ensureCollection('player_mode_stats')

ensureCollection('matchmaking_queue')
ensureCollection('matches')

ensureCollection('rooms')
ensureCollection('room_members')

ensureCollection('tournaments')
ensureCollection('tournament_participants')
ensureCollection('tournament_matches')

ensureCollection('games')
ensureCollection('game_moves')
ensureCollection('replay_bookmarks')

ensureCollection('bot_sessions')
ensureCollection('bot_move_requests')

ensureCollection('rank_tiers')
ensureCollection('database_audit_events')

print(`[ok] v2 collections created/ensured in database: ${DB_NAME}`)
