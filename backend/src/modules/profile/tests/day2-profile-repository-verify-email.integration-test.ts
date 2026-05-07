import * as assert from 'assert'
import { createHash, randomUUID } from 'crypto'

type VerifyResult = {
  ok: boolean
  reason?: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND'
  userId?: string
}

type IntegrationUserProfileDoc = {
  _id: string
  username: string
  emailVerifiedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

type IntegrationEmailTokenDoc = {
  userId: string
  purpose: 'verify_email'
  status: 'active' | 'consumed' | 'revoked'
  tokenHash: string
  createdAt: Date
  updatedAt?: Date
  expiresAt: Date
  consumedAt?: Date
}

async function run(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI
  const mongodbDbName = process.env.MONGODB_DB_NAME

  if (!mongodbUri || !mongodbDbName) {
    console.log('[integration-test] SKIPPED: MONGODB_URI or MONGODB_DB_NAME is not set; cannot run real Mongo verify-email concurrency test')
    return
  }

  const { MongoService } = await import('../../../shared/db/mongo.service')
  const { ProfileRepository } = await import('../profile.repository')

  const mongoService = new MongoService()

  try {
    await mongoService.connect()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`[integration-test] SKIPPED: unable to connect to MongoDB (${message})`)
    return
  }

  const repository = new ProfileRepository(mongoService)
  const db = mongoService.getDb()
  const userProfiles = db.collection<IntegrationUserProfileDoc>('users')
  const emailVerificationTokens = db.collection<IntegrationEmailTokenDoc>('auth_tokens')

  const suffix = randomUUID().replace(/-/g, '')
  const userId = `u-it-verify-${suffix}`
  const rawToken = `raw-token-${suffix}`
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const now = new Date()

  try {
    await userProfiles.insertOne({
      _id: userId,
      username: `integration-${suffix}`,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    await emailVerificationTokens.insertOne({
      userId,
      purpose: 'verify_email',
      status: 'active',
      tokenHash,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    })

    const [first, second] = (await Promise.all([
      repository.verifyEmailByTokenHash(tokenHash, now),
      repository.verifyEmailByTokenHash(tokenHash, now),
    ])) as [VerifyResult, VerifyResult]

    const results = [first, second]
    assert.equal(results.filter((item) => item.ok).length, 1)
    assert.equal(results.filter((item) => !item.ok && item.reason === 'TOKEN_NOT_FOUND').length, 1)

    const storedUser = await userProfiles.findOne({ _id: userId })
    const storedToken = await emailVerificationTokens.findOne({ tokenHash })

    assert.equal(Boolean(storedUser?.emailVerifiedAt), true)
    assert.equal(Boolean(storedToken?.consumedAt), true)

    console.log('[integration-test] Day 2 repository verify-email real Mongo concurrency test passed')
  } finally {
    await emailVerificationTokens.deleteMany({ userId })
    await userProfiles.deleteMany({ _id: userId })
    await mongoService.onModuleDestroy()
  }
}

run().catch((error) => {
  console.error('[integration-test] Day 2 repository verify-email real Mongo concurrency test failed', error)
  process.exit(1)
})
