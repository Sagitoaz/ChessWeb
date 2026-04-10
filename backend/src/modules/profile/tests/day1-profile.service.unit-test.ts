import * as assert from 'assert'
import { ProfileController } from '../profile.controller'
import {
  EmailVerificationTokenDoc,
  LeaderboardQuery,
  LeaderboardQueryResult,
  ProfileRepositoryPort,
  UserGamesQuery,
  UserGamesQueryResult,
  UserProfileDoc,
  VerifyTokenResult,
} from '../profile.repository.port'
import { ProfileService } from '../profile.service'

class InMemoryProfileRepository implements ProfileRepositoryPort {
  private readonly users = new Map<string, UserProfileDoc>()
  private readonly tokens = new Map<string, EmailVerificationTokenDoc>()

  seedUser(user: UserProfileDoc): void {
    this.users.set(user._id, user)
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

  async findUserStatsByUserId(_userId: string): Promise<null> {
    return null
  }

  async findUserRatingByUserId(_userId: string): Promise<null> {
    return null
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

  async createEmailVerificationToken(token: EmailVerificationTokenDoc): Promise<void> {
    this.tokens.set(token.tokenHash, token)
  }

  async verifyEmailByTokenHash(tokenHash: string, now: Date): Promise<VerifyTokenResult> {
    const token = this.tokens.get(tokenHash)
    if (!token || token.consumedAt) {
      return { ok: false, reason: 'TOKEN_NOT_FOUND' }
    }

    if (token.expiresAt <= now) {
      return { ok: false, reason: 'TOKEN_EXPIRED' }
    }

    const user = this.users.get(token.userId)
    if (!user) {
      return { ok: false, reason: 'USER_NOT_FOUND' }
    }

    this.tokens.set(tokenHash, { ...token, consumedAt: now })
    this.users.set(token.userId, {
      ...user,
      isVerified: true,
      updatedAt: now,
    })

    return { ok: true, userId: token.userId }
  }

  getTokenCount(): number {
    return this.tokens.size
  }
}

async function run(): Promise<void> {
  const repo = new InMemoryProfileRepository()
  const service = new ProfileService(repo)

  repo.seedUser({
    _id: 'u-001',
    username: 'member2',
    displayName: 'TV2',
    isActive: true,
    isVerified: false,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })

  repo.seedUser({
    _id: 'u-verified',
    username: 'member2-verified',
    displayName: 'TV2 Verified',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })

  const profileResult = await service.getProfile({ sub: 'u-001' })
  assert.equal(profileResult.ok, true)
  if (profileResult.ok) {
    assert.equal(profileResult.data.username, 'member2')
    assert.equal(profileResult.data.displayName, 'TV2')
  }

  const updateResult = await service.updateProfile({ sub: 'u-001' }, { displayName: 'TV2 Updated' })
  assert.equal(updateResult.ok, true)
  if (updateResult.ok) {
    assert.equal(updateResult.data.displayName, 'TV2 Updated')
  }

  const resendResult = await service.resendVerification({ userId: 'u-001' })
  assert.equal(resendResult.ok, true)
  assert.equal(repo.getTokenCount(), 1)

  const resendMissingUser = await service.resendVerification({ userId: 'u-missing' })
  assert.equal(resendMissingUser.ok, true)
  if (resendMissingUser.ok) {
    assert.equal(resendMissingUser.data.userId, 'u-missing')
    assert.equal(typeof resendMissingUser.data.expiresAt, 'string')
  }
  assert.equal(repo.getTokenCount(), 1)

  const resendVerifiedUser = await service.resendVerification({ userId: 'u-verified' })
  assert.equal(resendVerifiedUser.ok, true)
  if (resendVerifiedUser.ok) {
    assert.equal(resendVerifiedUser.data.userId, 'u-verified')
    assert.equal(typeof resendVerifiedUser.data.expiresAt, 'string')
  }
  assert.equal(repo.getTokenCount(), 1)

  const controller = new ProfileController(service)
  const fallbackRequestIdResponse = await controller.getProfile({ user: { sub: 'u-001' } })
  assert.equal(typeof fallbackRequestIdResponse.meta.requestId, 'string')
  assert.equal((fallbackRequestIdResponse.meta.requestId || '').length > 0, true)

  const passthroughRequestIdResponse = await controller.getProfile({ user: { sub: 'u-001' } }, 'req-day1-001')
  assert.equal(passthroughRequestIdResponse.meta.requestId, 'req-day1-001')

  const missingUserResult = await service.getProfile({ sub: 'u-missing' })
  assert.equal(missingUserResult.ok, false)

  console.log('[unit-test] Day 1 profile service tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 1 profile service tests failed', error)
  process.exit(1)
})
