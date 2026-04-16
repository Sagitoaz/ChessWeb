import * as assert from 'assert'
import { randomBytes, scryptSync } from 'crypto'
import {
  EmailVerificationTokenDoc,
  LeaderboardQuery,
  LeaderboardQueryResult,
  ProfileRepositoryPort,
  UserGamesQuery,
  UserGamesQueryResult,
  UserProfileDoc,
  UserRatingDoc,
  UserStatsDoc,
  VerifyTokenResult,
} from '../profile.repository.port'
import { ProfileService } from '../profile.service'

const hashPassword = (plainPassword: string): string => {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(plainPassword, salt, 64)
  return `${salt}.${derived.toString('hex')}`
}

class InMemoryProfileRepository implements ProfileRepositoryPort {
  private readonly users = new Map<string, UserProfileDoc>()
  private readonly stats = new Map<string, UserStatsDoc>()
  private readonly ratings = new Map<string, UserRatingDoc>()

  seedUser(user: UserProfileDoc): void {
    this.users.set(user._id, user)
  }

  seedStats(doc: UserStatsDoc): void {
    this.stats.set(doc.userId, doc)
  }

  seedRating(doc: UserRatingDoc): void {
    this.ratings.set(doc._id, doc)
  }

  async findUserProfileById(userId: string): Promise<UserProfileDoc | null> {
    return this.users.get(userId) || null
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    const user = this.users.get(userId)
    if (!user || !user.passwordHash) return null
    return user.passwordHash
  }

  async updatePasswordHashByUserId(userId: string, passwordHash: string, now: Date): Promise<boolean> {
    const user = this.users.get(userId)
    if (!user) return false

    this.users.set(userId, {
      ...user,
      passwordHash,
      updatedAt: now,
    })

    return true
  }

  async updateUserAvatarById(userId: string, avatar: { avatarUrl: string; avatarPublicId: string | null; now: Date }): Promise<UserProfileDoc | null> {
    const user = this.users.get(userId)
    if (!user) return null

    const updated: UserProfileDoc = {
      ...user,
      avatarUrl: avatar.avatarUrl,
      avatarPublicId: avatar.avatarPublicId,
      avatarUpdatedAt: avatar.now,
      updatedAt: avatar.now,
    }

    this.users.set(userId, updated)
    return updated
  }

  async findUserStatsByUserId(userId: string): Promise<UserStatsDoc | null> {
    return this.stats.get(userId) || null
  }

  async findUserRatingByUserId(userId: string): Promise<UserRatingDoc | null> {
    return this.ratings.get(userId) || null
  }

  async updateUserProfileDisplayName(userId: string, displayName: string | null): Promise<UserProfileDoc | null> {
    const user = this.users.get(userId)
    if (!user) return null

    const updated: UserProfileDoc = {
      ...user,
      displayName,
      updatedAt: new Date(),
    }

    this.users.set(userId, updated)
    return updated
  }

  async findLeaderboard(_query: LeaderboardQuery): Promise<LeaderboardQueryResult> {
    return {
      items: [],
      total: 0,
      modeApplied: false,
    }
  }

  async findUserGames(_userId: string, _query: UserGamesQuery): Promise<UserGamesQueryResult> {
    return {
      items: [],
      total: 0,
    }
  }

  async findUserModeStats(): Promise<{ totalGames: number; wins: number; losses: number; draws: number }> {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }
  }

  async createEmailVerificationToken(_token: EmailVerificationTokenDoc): Promise<void> {
    return
  }

  async verifyEmailByTokenHash(_tokenHash: string, _now: Date): Promise<VerifyTokenResult> {
    return { ok: false, reason: 'TOKEN_NOT_FOUND' }
  }
}

async function run(): Promise<void> {
  const repo = new InMemoryProfileRepository()
  const service = new ProfileService(repo)

  repo.seedUser({
    _id: 'u-day2-001',
    username: 'member2',
    passwordHash: hashPassword('old-password-123'),
    displayName: 'TV2',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })

  const uploadResult = await service.uploadAvatar(
    { sub: 'u-day2-001' },
    {
      avatarUrl: 'https://chessweb.local/avatar/u-day2-001.png',
      avatarPublicId: 'avatars/u-day2-001',
      mimeType: 'image/png',
      fileSize: 1024,
    }
  )

  assert.equal(uploadResult.ok, true)
  if (uploadResult.ok) {
    assert.equal(uploadResult.data.userId, 'u-day2-001')
    assert.equal(uploadResult.data.avatarPublicId, 'avatars/u-day2-001')
  }

  const invalidMimeTypeUpload = await service.uploadAvatar(
    { sub: 'u-day2-001' },
    {
      avatarUrl: 'https://chessweb.local/avatar/u-day2-001-invalid-mime.bmp',
      mimeType: 'image/bmp',
      fileSize: 1024,
    }
  )
  assert.equal(invalidMimeTypeUpload.ok, false)
  if (!invalidMimeTypeUpload.ok) {
    assert.equal(invalidMimeTypeUpload.error.code, 'VALIDATION_FAILED')
  }

  const invalidFileSizeUpload = await service.uploadAvatar(
    { sub: 'u-day2-001' },
    {
      avatarUrl: 'https://chessweb.local/avatar/u-day2-001-invalid-size.png',
      mimeType: 'image/png',
      fileSize: 2 * 1024 * 1024 + 1,
    }
  )
  assert.equal(invalidFileSizeUpload.ok, false)
  if (!invalidFileSizeUpload.ok) {
    assert.equal(invalidFileSizeUpload.error.code, 'VALIDATION_FAILED')
  }

  const defaultStatsResult = await service.getStats({ sub: 'u-day2-001' })
  assert.equal(defaultStatsResult.ok, true)
  if (defaultStatsResult.ok) {
    assert.equal(defaultStatsResult.data.totalGames, 0)
    assert.equal(defaultStatsResult.data.winRate, 0)
    assert.equal(defaultStatsResult.data.rating, null)
  }

  repo.seedStats({
    userId: 'u-day2-001',
    totalGames: 20,
    wins: 12,
    losses: 6,
    draws: 2,
    updatedAt: new Date('2026-03-29T09:00:00.000Z'),
  })
  repo.seedRating({
    _id: 'u-day2-001',
    rating: 1450,
    peakRating: 1505,
    updatedAt: new Date('2026-03-29T09:05:00.000Z'),
  })

  const statsResult = await service.getStats({ sub: 'u-day2-001' })
  assert.equal(statsResult.ok, true)
  if (statsResult.ok) {
    assert.equal(statsResult.data.totalGames, 20)
    assert.equal(statsResult.data.wins, 12)
    assert.equal(statsResult.data.winRate, 60)
    assert.equal(statsResult.data.rating, 1450)
    assert.equal(statsResult.data.peakRating, 1505)
  }

  console.log('[unit-test] Day 2 avatar/stats service tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 2 avatar/stats service tests failed', error)
  process.exit(1)
})
