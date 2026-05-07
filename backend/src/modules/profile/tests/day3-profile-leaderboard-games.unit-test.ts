import * as assert from 'assert'
import {
  EmailVerificationTokenDoc,
  LeaderboardQuery,
  LeaderboardQueryResult,
  ProfileRepositoryPort,
  UserGameDoc,
  UserGamesQuery,
  UserGamesQueryResult,
  UserProfileDoc,
  UserRatingDoc,
  UserStatsDoc,
  VerifyTokenResult,
} from '../profile.repository.port'
import { ProfileService } from '../profile.service'

class InMemoryProfileRepository implements ProfileRepositoryPort {
  private readonly users = new Map<string, UserProfileDoc>()
  private readonly ratings: UserRatingDoc[] = []
  private readonly games: UserGameDoc[] = []

  seedUser(user: UserProfileDoc): void {
    this.users.set(user._id, user)
  }

  seedRating(rating: UserRatingDoc): void {
    this.ratings.push(rating)
  }

  seedGame(game: UserGameDoc): void {
    this.games.push(game)
  }

  async findUserProfileById(userId: string): Promise<UserProfileDoc | null> {
    return this.users.get(userId) || null
  }

  async findPasswordHashByUserId(_userId: string): Promise<string | null> {
    return null
  }

  async updatePasswordHashByUserId(_userId: string, _passwordHash: string, _now: Date): Promise<boolean> {
    return false
  }

  async updateUserAvatarById(_userId: string, _avatar: { avatarUrl: string; avatarPublicId: string | null; now: Date }): Promise<UserProfileDoc | null> {
    return null
  }

  async findUserStatsByUserId(_userId: string): Promise<UserStatsDoc | null> {
    return null
  }

  async findUserRatingByUserId(_userId: string): Promise<UserRatingDoc | null> {
    return null
  }

  async updateUserProfileDisplayName(_userId: string, _displayName: string | null): Promise<UserProfileDoc | null> {
    return null
  }

  async findLeaderboard(query: LeaderboardQuery): Promise<LeaderboardQueryResult> {
    const canApplyMode = Boolean(query.mode) && this.ratings.some((item) => typeof item.mode === 'string' && item.mode.length > 0)

    const filtered = this.ratings.filter((item) => {
      if (canApplyMode) return item.mode === query.mode
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      const aRating = Number(a.rating || 0)
      const bRating = Number(b.rating || 0)
      const aPeak = Number(a.peakRating || 0)
      const bPeak = Number(b.peakRating || 0)

      if (query.sort === 'rating_asc') {
        if (aRating !== bRating) return aRating - bRating
        return bPeak - aPeak
      }

      if (query.sort === 'peak_desc') {
        if (aPeak !== bPeak) return bPeak - aPeak
        return bRating - aRating
      }

      if (query.sort === 'peak_asc') {
        if (aPeak !== bPeak) return aPeak - bPeak
        return bRating - aRating
      }

      if (aRating !== bRating) return bRating - aRating
      return bPeak - aPeak
    })

    const start = (query.page - 1) * query.pageSize
    const paged = sorted.slice(start, start + query.pageSize)

    return {
      items: paged.map((item) => ({
        userId: item._id,
        username: this.users.get(item._id)?.username || null,
        displayName: this.users.get(item._id)?.displayName || null,
        rating: Number(item.rating || 0),
        peakRating: Number(item.peakRating || 0),
        updatedAt: item.updatedAt || null,
      })),
      total: filtered.length,
      modeApplied: canApplyMode,
    }
  }

  async findUserGames(userId: string, query: UserGamesQuery): Promise<UserGamesQueryResult> {
    const filtered = this.games.filter((game) => {
      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) return false
      if (query.mode && game.mode !== query.mode) return false
      if (query.result && game.result !== query.result) return false
      if (query.fromDate && game.createdAt && game.createdAt < query.fromDate) return false
      if (query.toDate && game.createdAt && game.createdAt > query.toDate) return false
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0
      const bTime = b.createdAt ? b.createdAt.getTime() : 0
      return bTime - aTime
    })

    const start = (query.page - 1) * query.pageSize
    const items = sorted.slice(start, start + query.pageSize)

    return {
      items,
      total: filtered.length,
    }
  }

  async findUserModeStats(
    userId: string,
    mode?: 'ranked' | 'room' | 'bot' | 'tournament',
  ): Promise<{ gamesPlayed: number; wins: number; losses: number; draws: number }> {
    const filtered = this.games.filter((game) => {
      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) return false
      if (mode && game.mode !== mode) return false
      return true
    })

    return {
      gamesPlayed: filtered.length,
      wins: filtered.filter((g) => g.result === 'win').length,
      losses: filtered.filter((g) => g.result === 'lose').length,
      draws: filtered.filter((g) => g.result === 'draw').length,
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
    _id: 'u-lb-1',
    username: 'alpha',
    displayName: 'Alpha',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  })
  repo.seedUser({
    _id: 'u-lb-2',
    username: 'beta',
    displayName: 'Beta',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  })

  repo.seedRating({ _id: 'u-lb-1', rating: 1550, peakRating: 1600, updatedAt: new Date('2026-03-28T00:00:00.000Z') })
  repo.seedRating({ _id: 'u-lb-2', rating: 1450, peakRating: 1500, updatedAt: new Date('2026-03-27T00:00:00.000Z') })

  const leaderboardResult = await service.getLeaderboard({ page: 1, pageSize: 1, sort: 'rating_desc', mode: 'ranked' })
  assert.equal(leaderboardResult.ok, false)
  if (!leaderboardResult.ok) {
    assert.equal(leaderboardResult.error.code, 'VALIDATION_FAILED')
  }

  repo.seedUser({
    _id: 'u-games-1',
    username: 'games-user',
    displayName: 'Games User',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  })

  repo.seedGame({
    gameId: 'g-001',
    mode: 'ranked',
    whitePlayerId: 'u-games-1',
    blackPlayerId: 'u-other',
    result: 'win',
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
    finishedAt: new Date('2026-03-28T10:20:00.000Z'),
  })
  repo.seedGame({
    gameId: 'g-002',
    mode: 'bot',
    whitePlayerId: 'u-other',
    blackPlayerId: 'u-games-1',
    result: 'lose',
    createdAt: new Date('2026-03-27T10:00:00.000Z'),
    finishedAt: new Date('2026-03-27T10:15:00.000Z'),
  })

  const gamesResult = await service.getGames(
    { sub: 'u-games-1' },
    {
      page: 1,
      pageSize: 10,
      mode: 'ranked',
      result: 'win',
      fromDate: '2026-03-28T00:00:00.000Z',
      toDate: '2026-03-29T00:00:00.000Z',
    }
  )

  assert.equal(gamesResult.ok, true)
  if (gamesResult.ok) {
    assert.equal(gamesResult.data.total, 1)
    assert.equal(gamesResult.data.items[0].gameId, 'g-001')
    assert.equal(gamesResult.data.items[0].playerSide, 'white')
  }

  const invalidRangeResult = await service.getGames(
    { sub: 'u-games-1' },
    {
      fromDate: '2026-03-29T00:00:00.000Z',
      toDate: '2026-03-28T00:00:00.000Z',
    }
  )
  assert.equal(invalidRangeResult.ok, false)
  if (!invalidRangeResult.ok) {
    assert.equal(invalidRangeResult.error.code, 'VALIDATION_FAILED')
  }

  const invalidResultFilter = await service.getGames(
    { sub: 'u-games-1' },
    {
      page: 1,
      pageSize: 10,
      result: 'invalid-result' as never,
    }
  )
  assert.equal(invalidResultFilter.ok, false)
  if (!invalidResultFilter.ok) {
    assert.equal(invalidResultFilter.error.code, 'VALIDATION_FAILED')
  }

  const missingJwtResult = await service.getGames(undefined, { page: 1, pageSize: 5 })
  assert.equal(missingJwtResult.ok, false)
  if (!missingJwtResult.ok) {
    assert.equal(missingJwtResult.error.code, 'AUTH_FORBIDDEN')
  }

  console.log('[unit-test] Day 3 leaderboard/games service tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 3 leaderboard/games service tests failed', error)
  process.exit(1)
})
