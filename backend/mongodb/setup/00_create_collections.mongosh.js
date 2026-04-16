// Run with mongosh (PowerShell example):
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/00_create_collections.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

function ensureCollection(name, validator = null) {
  const exists = appDb.getCollectionNames().includes(name)
  if (exists) return

  const options = validator
    ? { validator: { $jsonSchema: validator }, validationLevel: 'moderate' }
    : {}

  appDb.createCollection(name, options)
}

ensureCollection('user_profiles', {
  bsonType: 'object',
  required: ['_id', 'username', 'createdAt', 'updatedAt'],
  properties: {
    _id: { bsonType: 'string', description: 'auth user id' },
    username: { bsonType: 'string' },
    displayName: { bsonType: ['string', 'null'] },
    isActive: { bsonType: ['bool', 'null'] },
    isVerified: { bsonType: ['bool', 'null'] },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
})

ensureCollection('user_settings')
ensureCollection('refresh_tokens')
ensureCollection('email_verification_tokens')
ensureCollection('user_stats')
ensureCollection('user_ratings')

ensureCollection('ranked_queue')
ensureCollection('ranked_matches')

ensureCollection('rooms')
ensureCollection('room_members')

ensureCollection('tournaments')
ensureCollection('tournament_participants')
ensureCollection('tournament_rounds')
ensureCollection('tournament_matches')

ensureCollection('games')
ensureCollection('game_moves')
ensureCollection('elo_history')
ensureCollection('replay_bookmarks')

ensureCollection('bot_sessions')
ensureCollection('bot_move_requests')

ensureCollection('rank_tiers')

print(`[ok] Collections created/ensured in database: ${DB_NAME}`)
