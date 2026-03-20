const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

const now = new Date()
const rankTiers = [
  { code: 'beginner', minElo: 0, maxElo: 799, colorHex: '#9CA3AF' },
  { code: 'intermediate', minElo: 800, maxElo: 1199, colorHex: '#10B981' },
  { code: 'advanced', minElo: 1200, maxElo: 1599, colorHex: '#3B82F6' },
  { code: 'expert', minElo: 1600, maxElo: 1999, colorHex: '#8B5CF6' },
  { code: 'master', minElo: 2000, maxElo: 2399, colorHex: '#F59E0B' },
  { code: 'grandmaster', minElo: 2400, maxElo: 9999, colorHex: '#EF4444' }
]

for (const tier of rankTiers) {
  appDb.rank_tiers.updateOne(
    { code: tier.code },
    { $set: { ...tier, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )
}

print(`[ok] Seed data upserted in database: ${DB_NAME}`)
