import * as assert from 'assert'
import { ProfileController } from '../profile.controller'
import { ServiceResult } from '../profile.service'

class StubProfileService {
  async verifyEmail(): Promise<ServiceResult<{ userId: string; verifiedAt: string }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        verifiedAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
      },
    }
  }

  async resendVerification(): Promise<ServiceResult<{ userId: string; expiresAt: string }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        expiresAt: new Date('2026-03-29T10:15:00.000Z').toISOString(),
      },
    }
  }

  async getProfile(): Promise<ServiceResult<{ userId: string; username: string; displayName: string | null; isVerified: boolean; isActive: boolean }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        username: 'request-id-user',
        displayName: 'Request ID User',
        isVerified: true,
        isActive: true,
      },
    }
  }

  async updateProfile(): Promise<ServiceResult<{ userId: string; username: string; displayName: string | null; updatedAt: string }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        username: 'request-id-user',
        displayName: 'Updated Request ID User',
        updatedAt: new Date('2026-03-29T10:01:00.000Z').toISOString(),
      },
    }
  }

  async updatePassword(): Promise<ServiceResult<{ userId: string; changedAt: string }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        changedAt: new Date('2026-03-29T10:02:00.000Z').toISOString(),
      },
    }
  }

  async uploadAvatar(): Promise<ServiceResult<{ userId: string; avatarUrl: string; avatarPublicId: string | null; updatedAt: string }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        avatarUrl: 'https://chessweb.local/avatar/u-request-id-001.png',
        avatarPublicId: 'avatars/u-request-id-001',
        updatedAt: new Date('2026-03-29T10:03:00.000Z').toISOString(),
      },
    }
  }

  async getStats(): Promise<ServiceResult<{ userId: string; totalGames: number; wins: number; losses: number; draws: number; winRate: number; rating: number | null; peakRating: number | null; updatedAt: string | null }>> {
    return {
      ok: true,
      data: {
        userId: 'u-request-id-001',
        totalGames: 10,
        wins: 6,
        losses: 3,
        draws: 1,
        winRate: 60,
        rating: 1400,
        peakRating: 1450,
        updatedAt: new Date('2026-03-29T10:04:00.000Z').toISOString(),
      },
    }
  }

  async getLeaderboard(): Promise<
    ServiceResult<{
      items: Array<{
        rank: number
        userId: string
        username: string | null
        displayName: string | null
        rating: number
        peakRating: number
        updatedAt: string | null
      }>
      page: number
      pageSize: number
      total: number
      mode: 'ranked' | 'room' | 'bot' | 'tournament' | null
      sort: 'rating_desc' | 'rating_asc' | 'peak_desc' | 'peak_asc'
      modeApplied: boolean
      note: string | null
    }>
  > {
    return {
      ok: true,
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        mode: null,
        sort: 'rating_desc',
        modeApplied: true,
        note: null,
      },
    }
  }

  async getGames(): Promise<
    ServiceResult<{
      items: Array<{
        gameId: string
        mode: string | null
        whitePlayerId: string | null
        blackPlayerId: string | null
        playerSide: 'white' | 'black' | 'unknown'
        result: string | null
        createdAt: string | null
        finishedAt: string | null
      }>
      page: number
      pageSize: number
      total: number
      filters: {
        mode: 'ranked' | 'room' | 'bot' | 'tournament' | null
        result: string | null
        fromDate: string | null
        toDate: string | null
      }
    }>
  > {
    return {
      ok: true,
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        filters: {
          mode: null,
          result: null,
          fromDate: null,
          toDate: null,
        },
      },
    }
  }
}

const assertGeneratedRequestId = (requestId: string | null): void => {
  assert.equal(typeof requestId, 'string')
  if (typeof requestId !== 'string') {
    throw new Error('Expected requestId to be a string')
  }
  assert.equal(requestId.trim().length > 0, true)
}

async function run(): Promise<void> {
  const service = new StubProfileService()
  const controller = new ProfileController(service as never)

  const withoutHeaderResponses = await Promise.all([
    controller.verifyEmail({ token: 'token-value' }),
    controller.resendVerification({ userId: 'u-request-id-001' }),
    controller.getProfile({ user: { sub: 'u-request-id-001' } }),
    controller.updateProfile({ user: { sub: 'u-request-id-001' } }, { displayName: 'Updated Request ID User' }),
    controller.updatePassword(
      { user: { sub: 'u-request-id-001' } },
      {
        currentPassword: 'old-password-123',
        newPassword: 'new-password-123',
        confirmNewPassword: 'new-password-123',
      }
    ),
    controller.uploadAvatar(
      { user: { sub: 'u-request-id-001' } },
      {
        avatarUrl: 'https://chessweb.local/avatar/u-request-id-001.png',
        avatarPublicId: 'avatars/u-request-id-001',
      }
    ),
    controller.getStats({ user: { sub: 'u-request-id-001' } }),
    controller.getLeaderboard({}),
    controller.getGames({ user: { sub: 'u-request-id-001' } }, {}),
  ])

  for (const response of withoutHeaderResponses) {
    assertGeneratedRequestId(response.meta.requestId)
  }

  const withHeaderResponses = await Promise.all([
    controller.verifyEmail({ token: 'token-value' }, 'req-profile-verify-email'),
    controller.resendVerification({ userId: 'u-request-id-001' }, 'req-profile-resend-verification'),
    controller.getProfile({ user: { sub: 'u-request-id-001' } }, 'req-profile-get-profile'),
    controller.updateProfile(
      { user: { sub: 'u-request-id-001' } },
      { displayName: 'Updated Request ID User' },
      'req-profile-update-profile'
    ),
    controller.updatePassword(
      { user: { sub: 'u-request-id-001' } },
      {
        currentPassword: 'old-password-123',
        newPassword: 'new-password-123',
        confirmNewPassword: 'new-password-123',
      },
      'req-profile-update-password'
    ),
    controller.uploadAvatar(
      { user: { sub: 'u-request-id-001' } },
      {
        avatarUrl: 'https://chessweb.local/avatar/u-request-id-001.png',
        avatarPublicId: 'avatars/u-request-id-001',
      },
      'req-profile-upload-avatar'
    ),
    controller.getStats({ user: { sub: 'u-request-id-001' } }, 'req-profile-get-stats'),
    controller.getLeaderboard({}, 'req-profile-get-leaderboard'),
    controller.getGames({ user: { sub: 'u-request-id-001' } }, {}, 'req-profile-get-games'),
  ])

  assert.equal(withHeaderResponses[0].meta.requestId, 'req-profile-verify-email')
  assert.equal(withHeaderResponses[1].meta.requestId, 'req-profile-resend-verification')
  assert.equal(withHeaderResponses[2].meta.requestId, 'req-profile-get-profile')
  assert.equal(withHeaderResponses[3].meta.requestId, 'req-profile-update-profile')
  assert.equal(withHeaderResponses[4].meta.requestId, 'req-profile-update-password')
  assert.equal(withHeaderResponses[5].meta.requestId, 'req-profile-upload-avatar')
  assert.equal(withHeaderResponses[6].meta.requestId, 'req-profile-get-stats')
  assert.equal(withHeaderResponses[7].meta.requestId, 'req-profile-get-leaderboard')
  assert.equal(withHeaderResponses[8].meta.requestId, 'req-profile-get-games')

  console.log('[unit-test] Day 2 profile controller requestId tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 2 profile controller requestId tests failed', error)
  process.exit(1)
})
