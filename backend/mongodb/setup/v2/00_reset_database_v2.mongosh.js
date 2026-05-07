// MongoDB v2 destructive reset.
// This script intentionally drops only the configured application database.
//
// Required:
//   ALLOW_DB_RESET=true
//   MONGODB_DB_NAME=<target database>
//
// Production extra guard:
//   ALLOW_PROD_DB_RESET=true
//
// Run:
//   mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/v2/00_reset_database_v2.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const ALLOW_DB_RESET = String(process?.env?.ALLOW_DB_RESET || '').toLowerCase() === 'true'
const ALLOW_PROD_DB_RESET = String(process?.env?.ALLOW_PROD_DB_RESET || '').toLowerCase() === 'true'

if (!ALLOW_DB_RESET) {
  throw new Error('Refusing to reset database. Set ALLOW_DB_RESET=true to continue.')
}

if (/prod|production/i.test(DB_NAME) && !ALLOW_PROD_DB_RESET) {
  throw new Error('Refusing to reset a production-like database. Set ALLOW_PROD_DB_RESET=true if this is intentional.')
}

const appDb = db.getSiblingDB(DB_NAME)
const collections = appDb.getCollectionNames()

print(`[reset-v2] Clearing database: ${DB_NAME}`)
print(`[reset-v2] Collections found: ${collections.length}`)

for (const collectionName of collections) {
  print(`[reset-v2] Dropping collection: ${collectionName}`)
  appDb.getCollection(collectionName).drop()
}

print(`[ok] Database collections cleared: ${DB_NAME}`)
