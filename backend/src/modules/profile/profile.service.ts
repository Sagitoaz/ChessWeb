import { Injectable, Inject } from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { env } from '../../shared/config/env'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
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

  async resendVerification(dto: ResendVerificationDto): Promise<ServiceResult<{ userId: string; expiresAt: string; tokenPreview?: string }>> {
    const userId = dto.userId.trim()
    const profile = await this.repository.findUserProfileById(userId)
    if (!profile) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Khong tim thay nguoi dung de gui lai xac thuc email',
          details: { userId },
        },
      }
    }

    if (profile.isVerified) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Email da duoc xac thuc',
          details: { userId },
        },
      }
    }

    const rawToken = randomBytes(24).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

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
        tokenPreview: env.nodeEnv === 'production' ? undefined : rawToken,
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
