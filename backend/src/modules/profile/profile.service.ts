import { Injectable, Inject } from '@nestjs/common'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { GAME_RESULT_VALUES, GetGamesQueryDto } from './dto/get-games.query.dto'
import { GetLeaderboardQueryDto } from './dto/get-leaderboard.query.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { UpdatePasswordDto } from './dto/update-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UploadAvatarDto } from './dto/upload-avatar.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ProfileRepositoryPort } from './profile.repository.port'

export const PROFILE_REPOSITORY = 'PROFILE_REPOSITORY'

export interface ServiceError {
  code: string
  message: string
  details?: unknown
}

export type ServiceResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: ServiceError
    }

interface JwtUserLike {
  sub?: string
  userId?: string
  id?: string
}

const scryptAsync = promisify(scrypt)
const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024
const EMAIL_VERIFICATION_EXPIRY_MS = 15 * 60 * 1000
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const GAME_RESULT_SET = new Set<string>(GAME_RESULT_VALUES)

export interface LeaderboardItem {
  rank: number
  userId: string
  username: string | null
  displayName: string | null
  rating: number
  peakRating: number
  updatedAt: string | null
}

export interface LeaderboardResponse {
  items: LeaderboardItem[]
  page: number
  pageSize: number
  total: number
  mode: 'ranked' | 'room' | 'bot' | 'tournament' | null
  sort: 'rating_desc' | 'rating_asc' | 'peak_desc' | 'peak_asc'
  modeApplied: boolean
  note: string | null
}

export interface UserGameItem {
  gameId: string
  mode: string | null
  whitePlayerId: string | null
  blackPlayerId: string | null
  playerSide: 'white' | 'black' | 'unknown'
  result: string | null
  createdAt: string | null
  finishedAt: string | null
}

export interface UserGamesResponse {
  items: UserGameItem[]
  page: number
  pageSize: number
  total: number
  filters: {
    mode: 'ranked' | 'room' | 'bot' | 'tournament' | null
    result: 'win' | 'lose' | 'draw' | null
    fromDate: string | null
    toDate: string | null
  }
}

const hashPassword = async (plainPassword: string, saltHex?: string): Promise<string> => {
  const salt = saltHex || randomBytes(16).toString('hex')
  const derived = (await scryptAsync(plainPassword, salt, 64)) as Buffer
  return `${salt}.${derived.toString('hex')}`
}

const verifyPassword = async (plainPassword: string, storedHash: string): Promise<boolean> => {
  const [salt, hashHex] = storedHash.split('.')
  if (!salt || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length === 0) return false

  let actual: Buffer
  try {
    actual = (await scryptAsync(plainPassword, salt, expected.length)) as Buffer
  } catch {
    return false
  }

  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

@Injectable()
export class ProfileService {
  constructor(@Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepositoryPort) {}

  extractUserIdFromJwt(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null

    const payload = user as JwtUserLike
    const userId = payload.sub || payload.userId || payload.id
    if (!userId || typeof userId !== 'string') return null

    return userId
  }

  async getProfile(authUser: unknown): Promise<ServiceResult<{ userId: string; username: string; displayName: string | null; isVerified: boolean; isActive: boolean }>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    const profile = await this.repository.findUserProfileById(userId)
    if (!profile) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    return {
      ok: true,
      data: {
        userId: profile._id,
        username: profile.username,
        displayName: profile.displayName || null,
        isVerified: Boolean(profile.isVerified),
        isActive: profile.isActive === null || profile.isActive === undefined ? true : Boolean(profile.isActive),
      },
    }
  }

  async updateProfile(authUser: unknown, dto: UpdateProfileDto): Promise<ServiceResult<{ userId: string; username: string; displayName: string | null; updatedAt: string }>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    const displayName = dto.displayName?.trim() || null
    const updated = await this.repository.updateUserProfileDisplayName(userId, displayName)
    if (!updated) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    return {
      ok: true,
      data: {
        userId: updated._id,
        username: updated.username,
        displayName: updated.displayName || null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  }

  async updatePassword(authUser: unknown, dto: UpdatePasswordDto): Promise<ServiceResult<{ userId: string; changedAt: string }>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Xac nhan mat khau moi khong khop',
        },
      }
    }

    if (dto.currentPassword === dto.newPassword) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Mat khau moi phai khac mat khau hien tai',
        },
      }
    }

    const storedHash = await this.repository.findPasswordHashByUserId(userId)
    if (!storedHash || !(await verifyPassword(dto.currentPassword, storedHash))) {
      return {
        ok: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Sai mat khau hien tai',
        },
      }
    }

    const now = new Date()
    const nextHash = await hashPassword(dto.newPassword)
    const updated = await this.repository.updatePasswordHashByUserId(userId, nextHash, now)
    if (!updated) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    return {
      ok: true,
      data: {
        userId,
        changedAt: now.toISOString(),
      },
    }
  }

  async uploadAvatar(
    authUser: unknown,
    dto: UploadAvatarDto
  ): Promise<ServiceResult<{ userId: string; avatarUrl: string; avatarPublicId: string | null; updatedAt: string }>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    const profile = await this.repository.findUserProfileById(userId)
    if (!profile) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    if (dto.mimeType && !AVATAR_ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Dinh dang anh khong ho tro',
          details: { mimeType: dto.mimeType },
        },
      }
    }

    if (
      dto.fileSize !== undefined &&
      (!Number.isInteger(dto.fileSize) || dto.fileSize < 1 || dto.fileSize > AVATAR_MAX_FILE_SIZE)
    ) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Kich thuoc tep avatar khong hop le',
          details: { fileSize: dto.fileSize, maxFileSize: AVATAR_MAX_FILE_SIZE },
        },
      }
    }

    const now = new Date()
    const updated = await this.repository.updateUserAvatarById(userId, {
      avatarUrl: dto.avatarUrl,
      avatarPublicId: dto.avatarPublicId || null,
      now,
    })

    if (!updated) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    return {
      ok: true,
      data: {
        userId: updated._id,
        avatarUrl: updated.avatarUrl || dto.avatarUrl,
        avatarPublicId: updated.avatarPublicId || null,
        updatedAt: (updated.avatarUpdatedAt || now).toISOString(),
      },
    }
  }

  async getStats(
    authUser: unknown
  ): Promise<ServiceResult<{ userId: string; totalGames: number; wins: number; losses: number; draws: number; winRate: number; rating: number | null; peakRating: number | null; updatedAt: string | null }>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    const profile = await this.repository.findUserProfileById(userId)
    if (!profile) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay ho so nguoi dung',
          details: { userId },
        },
      }
    }

    const [stats, rating] = await Promise.all([
      this.repository.findUserStatsByUserId(userId),
      this.repository.findUserRatingByUserId(userId),
    ])

    const totalGames = Number(stats?.totalGames || 0)
    const wins = Number(stats?.wins || 0)
    const losses = Number(stats?.losses || 0)
    const draws = Number(stats?.draws || 0)
    const winRate = totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(2)) : 0

    return {
      ok: true,
      data: {
        userId,
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        rating: rating?.rating ?? null,
        peakRating: rating?.peakRating ?? null,
        updatedAt: stats?.updatedAt ? stats.updatedAt.toISOString() : null,
      },
    }
  }

  async getLeaderboard(query: GetLeaderboardQueryDto): Promise<ServiceResult<LeaderboardResponse>> {
    const page = query.page || DEFAULT_PAGE
    const pageSize = query.pageSize || DEFAULT_PAGE_SIZE
    const sort = query.sort || 'rating_desc'

    const result = await this.repository.findLeaderboard({
      page,
      pageSize,
      mode: query.mode,
      sort,
    })

    if (query.mode && !result.modeApplied) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Khong the ap dung mode filter voi du lieu leaderboard hien tai',
          details: {
            mode: query.mode,
          },
        },
      }
    }

    const items: LeaderboardItem[] = result.items.map((item, index) => ({
      rank: (page - 1) * pageSize + index + 1,
      userId: item.userId,
      username: item.username,
      displayName: item.displayName,
      rating: Number(item.rating || 0),
      peakRating: Number(item.peakRating || 0),
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    }))

    const modeApplied = result.modeApplied

    return {
      ok: true,
      data: {
        items,
        page,
        pageSize,
        total: result.total,
        mode: query.mode || null,
        sort,
        modeApplied,
        note: null,
      },
    }
  }

  async getGames(authUser: unknown, query: GetGamesQueryDto): Promise<ServiceResult<UserGamesResponse>> {
    const userId = this.extractUserIdFromJwt(authUser)
    if (!userId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'Khong xac dinh duoc user tu access token',
        },
      }
    }

    const page = query.page || DEFAULT_PAGE
    const pageSize = query.pageSize || DEFAULT_PAGE_SIZE

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined
    const toDate = query.toDate ? new Date(query.toDate) : undefined

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'fromDate khong hop le',
        },
      }
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'toDate khong hop le',
        },
      }
    }

    if (fromDate && toDate && fromDate > toDate) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'fromDate phai nho hon hoac bang toDate',
        },
      }
    }

    const normalizedResult = query.result?.trim() || undefined
    if (normalizedResult && !GAME_RESULT_SET.has(normalizedResult)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'result khong hop le',
          details: {
            allowedValues: GAME_RESULT_VALUES,
          },
        },
      }
    }

    const result = await this.repository.findUserGames(userId, {
      page,
      pageSize,
      mode: query.mode,
      result: normalizedResult as 'win' | 'lose' | 'draw' | undefined,
      fromDate,
      toDate,
    })

    const items: UserGameItem[] = result.items.map((game) => ({
      gameId: game.gameId,
      mode: game.mode,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      playerSide: game.whitePlayerId === userId ? 'white' : game.blackPlayerId === userId ? 'black' : 'unknown',
      result: game.result,
      createdAt: game.createdAt ? game.createdAt.toISOString() : null,
      finishedAt: game.finishedAt ? game.finishedAt.toISOString() : null,
    }))

    return {
      ok: true,
      data: {
        items,
        page,
        pageSize,
        total: result.total,
        filters: {
          mode: query.mode || null,
          result: (normalizedResult as 'win' | 'lose' | 'draw' | undefined) || null,
          fromDate: query.fromDate || null,
          toDate: query.toDate || null,
        },
      },
    }
  }

  async resendVerification(dto: ResendVerificationDto): Promise<ServiceResult<{ userId: string; expiresAt: string }>> {
    const userId = dto.userId.trim()
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
    const profile = await this.repository.findUserProfileById(userId)
    if (!profile || profile.isVerified) {
      return {
        ok: true,
        data: {
          userId,
          expiresAt: expiresAt.toISOString(),
        },
      }
    }

    const rawToken = randomBytes(24).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const now = new Date()

    await this.repository.createEmailVerificationToken({
      userId,
      purpose: 'verify_email',
      tokenHash,
      createdAt: now,
      expiresAt,
    })

    return {
      ok: true,
      data: {
        userId,
        expiresAt: expiresAt.toISOString(),
      },
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<ServiceResult<{ userId: string; verifiedAt: string }>> {
    const tokenHash = createHash('sha256').update(dto.token.trim()).digest('hex')
    const now = new Date()
    const result = await this.repository.verifyEmailByTokenHash(tokenHash, now)

    if (!result.ok || !result.userId) {
      if (result.reason === 'TOKEN_EXPIRED') {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Token xac thuc email da het han',
          },
        }
      }

      if (result.reason === 'USER_NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Nguoi dung khong ton tai',
          },
        }
      }

      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Token xac thuc email khong hop le',
        },
      }
    }

    return {
      ok: true,
      data: {
        userId: result.userId,
        verifiedAt: now.toISOString(),
      },
    }
  }
}
