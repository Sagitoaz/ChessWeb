import * as assert from 'assert'
import { randomUUID } from 'crypto'

type IntegrationUserProfileDoc = {
  _id: string
  username: string
  displayName?: string | null
  emailVerifiedAt?: Date | null
  status: 'active' | 'disabled' | 'pending_verification'
  createdAt: Date
  updatedAt: Date
}

type IntegrationUserRatingDoc = {
  _id: string
  userId: string
  mode?: 'ranked' | 'room' | 'bot' | 'tournament'
  rating: number
  peakRating: number
  updatedAt: Date
}

type IntegrationGameDoc = {
  _id: string
  mode: 'ranked' | 'room' | 'bot' | 'tournament'
  whitePlayerId: string
  blackPlayerId: string
  result: 'win' | 'lose' | 'draw'
  createdAt: Date
  finishedAt: Date
}

async function run(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI
  const mongodbDbName = process.env.MONGODB_DB_NAME

  if (!mongodbUri || !mongodbDbName) {
    console.log('[integration-test] SKIPPED: MONGODB_URI or MONGODB_DB_NAME is not set; cannot run real Mongo leaderboard/games repository test')
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
  const userRatings = db.collection<IntegrationUserRatingDoc>('player_ratings')
  const games = db.collection<IntegrationGameDoc>('games')

  const suffix = randomUUID().replace(/-/g, '')
  const userA = `u-it-day3-a-${suffix}`
  const userB = `u-it-day3-b-${suffix}`
  const now = new Date('2026-03-29T00:00:00.000Z')

  try {
    await userProfiles.insertMany([
      {
        _id: userA,
        username: `day3-${suffix}-a`,
        displayName: 'Day3 A',
        emailVerifiedAt: now,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: userB,
        username: `day3-${suffix}-b`,
        displayName: 'Day3 B',
        emailVerifiedAt: now,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await userRatings.insertMany([
      {
        _id: `${userA}:ranked`,
        userId: userA,
        mode: 'ranked',
        rating: 1710,
        peakRating: 1750,
        updatedAt: now,
      },
      {
        _id: `${userB}:bot`,
        userId: userB,
        mode: 'bot',
        rating: 1200,
        peakRating: 1300,
        updatedAt: now,
      },
    ])

    await games.insertMany([
      {
        _id: `g-it-day3-1-${suffix}`,
        mode: 'ranked',
        whitePlayerId: userA,
        blackPlayerId: userB,
        result: 'win',
        createdAt: new Date('2026-03-29T10:00:00.000Z'),
        finishedAt: new Date('2026-03-29T10:20:00.000Z'),
      },
      {
        _id: `g-it-day3-2-${suffix}`,
        mode: 'ranked',
        whitePlayerId: userA,
        blackPlayerId: userB,
        result: 'draw',
        createdAt: new Date('2026-03-28T10:00:00.000Z'),
        finishedAt: new Date('2026-03-28T10:15:00.000Z'),
      },
      {
        _id: `g-it-day3-3-${suffix}`,
        mode: 'bot',
        whitePlayerId: userA,
        blackPlayerId: userB,
        result: 'lose',
        createdAt: new Date('2026-03-27T10:00:00.000Z'),
        finishedAt: new Date('2026-03-27T10:10:00.000Z'),
      },
    ])

    const leaderboard = await repository.findLeaderboard({
      page: 1,
      pageSize: 10,
      mode: 'ranked',
      sort: 'rating_desc',
    })

    assert.equal(leaderboard.modeApplied, true)
    assert.equal(leaderboard.total, 1)
    assert.equal(leaderboard.items.length, 1)
    assert.equal(leaderboard.items[0].userId, userA)

    const gamesResult = await repository.findUserGames(userA, {
      page: 1,
      pageSize: 10,
      mode: 'ranked',
      result: 'win',
    })

    assert.equal(gamesResult.total, 1)
    assert.equal(gamesResult.items.length, 1)
    assert.equal(gamesResult.items[0].gameId, `g-it-day3-1-${suffix}`)
    assert.equal(gamesResult.items[0].mode, 'ranked')
    assert.equal(gamesResult.items[0].result, 'win')

    console.log('[integration-test] Day 3 repository leaderboard/games real Mongo test passed')
  } finally {
    await games.deleteMany({ _id: { $regex: `^g-it-day3-.*-${suffix}$` } as never })
    await userRatings.deleteMany({ userId: { $in: [userA, userB] } })
    await userProfiles.deleteMany({ _id: { $in: [userA, userB] } })
    await mongoService.onModuleDestroy()
  }
}

run().catch((error) => {
  console.error('[integration-test] Day 3 repository leaderboard/games real Mongo test failed', error)
  process.exit(1)
})
