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

    const updated = {
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
    _id: 'u-pass-001',
    username: 'member2',
    passwordHash: hashPassword('old-password-123'),
    displayName: 'TV2',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
  })

  const successResult = await service.updatePassword(
    { sub: 'u-pass-001' },
    {
      currentPassword: 'old-password-123',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    }
  )
  assert.equal(successResult.ok, true)

  const mismatchResult = await service.updatePassword(
    { sub: 'u-pass-001' },
    {
      currentPassword: 'new-password-123',
      newPassword: 'another-password-123',
      confirmNewPassword: 'not-match-password-123',
    }
  )
  assert.equal(mismatchResult.ok, false)
  if (!mismatchResult.ok) {
    assert.equal(mismatchResult.error.code, 'VALIDATION_FAILED')
  }

  const wrongCurrentResult = await service.updatePassword(
    { sub: 'u-pass-001' },
    {
      currentPassword: 'wrong-password-123',
      newPassword: 'secure-password-123',
      confirmNewPassword: 'secure-password-123',
    }
  )
  assert.equal(wrongCurrentResult.ok, false)
  if (!wrongCurrentResult.ok) {
    assert.equal(wrongCurrentResult.error.code, 'AUTH_INVALID_CREDENTIALS')
  }

  console.log('[unit-test] Day 2 password service tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 2 password service tests failed', error)
  process.exit(1)
})
