import * as assert from 'assert'
import { EmailVerificationTokenDoc, UserProfileDoc } from '../profile.repository.port'
import { ProfileRepository } from '../profile.repository'

type UpdateResult = { matchedCount: number }

class FakeUserProfilesCollection {
  constructor(private readonly users: Map<string, UserProfileDoc>) {}

  async updateOne(
    filter: { _id: string },
    update: { $set: { emailVerifiedAt: Date; updatedAt: Date } }
  ): Promise<UpdateResult> {
    const current = this.users.get(filter._id)
    if (!current) {
      return { matchedCount: 0 }
    }

    this.users.set(filter._id, {
      ...current,
      emailVerifiedAt: update.$set.emailVerifiedAt,
      updatedAt: update.$set.updatedAt,
    })

    return { matchedCount: 1 }
  }
}

class FakeTokensCollection {
  constructor(private readonly tokens: Map<string, EmailVerificationTokenDoc>) {}

  async findOneAndUpdate(
    filter: {
      tokenHash: string
      purpose: 'verify_email'
      status: 'active'
      expiresAt: { $gt: Date }
    },
    update: { $set: { status: 'consumed'; consumedAt: Date; updatedAt: Date } }
  ): Promise<EmailVerificationTokenDoc | null> {
    const token = this.tokens.get(filter.tokenHash)
    if (!token) return null
    if (token.purpose !== filter.purpose) return null
    if (token.status !== 'active') return null
    if (!(token.expiresAt > filter.expiresAt.$gt)) return null

    this.tokens.set(filter.tokenHash, {
      ...token,
      status: update.$set.status,
      consumedAt: update.$set.consumedAt,
    })

    return token
  }

  async findOne(filter: {
    tokenHash: string
    purpose: 'verify_email'
    status: 'active'
  }): Promise<EmailVerificationTokenDoc | null> {
    const token = this.tokens.get(filter.tokenHash)
    if (!token) return null
    if (token.purpose !== filter.purpose) return null
    if (token.status !== 'active') return null
    return token
  }
}

class FakeDb {
  readonly users = new Map<string, UserProfileDoc>()
  readonly tokens = new Map<string, EmailVerificationTokenDoc>()

  private readonly usersCollection = new FakeUserProfilesCollection(this.users)
  private readonly tokensCollection = new FakeTokensCollection(this.tokens)

  collection(name: string): unknown {
    if (name === 'users') return this.usersCollection
    if (name === 'auth_tokens') return this.tokensCollection
    throw new Error(`Unsupported collection in unit test: ${name}`)
  }
}

class FakeMongoService {
  constructor(private readonly db: FakeDb) {}

  getDb(): FakeDb {
    return this.db
  }
}

const createRepository = (db: FakeDb): ProfileRepository => {
  const mongoService = new FakeMongoService(db)
  return new ProfileRepository(mongoService as never)
}

async function run(): Promise<void> {
  const now = new Date('2026-03-29T10:00:00.000Z')

  const raceDb = new FakeDb()
  const raceRepo = createRepository(raceDb)
  raceDb.users.set('u-race-001', {
    _id: 'u-race-001',
    username: 'race-user',
    isVerified: false,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })
  raceDb.tokens.set('hash-race-001', {
    userId: 'u-race-001',
    purpose: 'verify_email',
    status: 'active',
    tokenHash: 'hash-race-001',
    createdAt: new Date('2026-03-29T09:00:00.000Z'),
    expiresAt: new Date('2026-03-29T10:15:00.000Z'),
  })

  const [firstRaceResult, secondRaceResult] = await Promise.all([
    raceRepo.verifyEmailByTokenHash('hash-race-001', now),
    raceRepo.verifyEmailByTokenHash('hash-race-001', now),
  ])

  const raceResults = [firstRaceResult, secondRaceResult]
  assert.equal(raceResults.filter((item) => item.ok).length, 1)
  assert.equal(raceResults.filter((item) => !item.ok && item.reason === 'TOKEN_NOT_FOUND').length, 1)
  assert.equal(Boolean(raceDb.users.get('u-race-001')?.emailVerifiedAt), true)
  assert.equal(Boolean(raceDb.tokens.get('hash-race-001')?.consumedAt), true)

  const expiredDb = new FakeDb()
  const expiredRepo = createRepository(expiredDb)
  expiredDb.users.set('u-expired-001', {
    _id: 'u-expired-001',
    username: 'expired-user',
    isVerified: false,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })
  expiredDb.tokens.set('hash-expired-001', {
    userId: 'u-expired-001',
    purpose: 'verify_email',
    status: 'active',
    tokenHash: 'hash-expired-001',
    createdAt: new Date('2026-03-29T08:00:00.000Z'),
    expiresAt: new Date('2026-03-29T09:59:59.000Z'),
  })

  const expiredResult = await expiredRepo.verifyEmailByTokenHash('hash-expired-001', now)
  assert.equal(expiredResult.ok, false)
  assert.equal(expiredResult.reason, 'TOKEN_EXPIRED')

  const userMissingDb = new FakeDb()
  const userMissingRepo = createRepository(userMissingDb)
  userMissingDb.tokens.set('hash-user-missing-001', {
    userId: 'u-user-missing-001',
    purpose: 'verify_email',
    status: 'active',
    tokenHash: 'hash-user-missing-001',
    createdAt: new Date('2026-03-29T08:00:00.000Z'),
    expiresAt: new Date('2026-03-29T10:20:00.000Z'),
  })

  const userMissingResult = await userMissingRepo.verifyEmailByTokenHash('hash-user-missing-001', now)
  assert.equal(userMissingResult.ok, false)
  assert.equal(userMissingResult.reason, 'USER_NOT_FOUND')

  console.log('[unit-test] Day 2 repository verify-email tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 2 repository verify-email tests failed', error)
  process.exit(1)
})
