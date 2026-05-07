const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

const now = new Date()
const rankTiers = [
  { code: 'beginner', minRating: 0, maxRating: 799, colorHex: '#9CA3AF', label: 'Beginner' },
  { code: 'intermediate', minRating: 800, maxRating: 1199, colorHex: '#10B981', label: 'Intermediate' },
  { code: 'advanced', minRating: 1200, maxRating: 1599, colorHex: '#3B82F6', label: 'Advanced' },
  { code: 'expert', minRating: 1600, maxRating: 1999, colorHex: '#8B5CF6', label: 'Expert' },
  { code: 'master', minRating: 2000, maxRating: 2399, colorHex: '#F59E0B', label: 'Master' },
  { code: 'grandmaster', minRating: 2400, maxRating: 9999, colorHex: '#EF4444', label: 'Grandmaster' }
]

for (const tier of rankTiers) {
  appDb.rank_tiers.updateOne(
    { code: tier.code },
    { $set: { ...tier, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )
}

print(`[ok] v2 reference seed completed in database: ${DB_NAME}`)
