import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import { Collection, Db } from 'mongodb'
import { Role } from '../../shared/auth/roles.enum'
import { env } from '../../shared/config/env'
import { MongoService } from '../../shared/db/mongo.service'
import { ApiResponse, successResponse } from '../../shared/http/response.util'
import {
  CheckEmailDto,
  CheckUsernameDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/identity.dto'

interface UserProfileDocument {
  _id: string
  username: string
  email?: string
  passwordHash?: string
  displayName?: string | null
  isActive?: boolean | null
  isVerified?: boolean | null
  role?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

interface RefreshTokenDocument {
  tokenHash: string
  userId: string
  sessionId: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  revokedAt: Date | null
}

interface PasswordResetTokenDocument {
  userId: string
  purpose: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  usedAt: Date | null
}

interface JwtRefreshPayload {
  sub: string
  sid: string
  type: 'refresh'
  iat: number
  exp: number
}

interface AuthUserPayload {
  sub?: unknown
  id?: unknown
  userId?: unknown
}

interface UserResponseData {
  id: string
  username: string
  email: string | null
  displayName: string | null
  isActive: boolean
  isVerified: boolean
  role: Role
  createdAt: string
  updatedAt: string
}

interface LoginResponseData {
  user: UserResponseData
  token: string
  refreshToken: string
}

interface RegisterResponseData {
  user: UserResponseData
  token: string
  refreshToken: string
}

interface LogoutResponseData {
  message: string
}

interface RefreshResponseData {
  token: string
  refreshToken: string
}

interface ForgotPasswordResponseData {
  message: string
  resetToken?: string
  expiresAt?: string
}

interface ResetPasswordResponseData {
  message: string
}

interface AvailabilityResponseData {
  available: boolean
}

interface MeResponseData {
  user: UserResponseData
}

@Injectable()
export class IdentityService {
  private static readonly PASSWORD_RESET_PURPOSE = 'reset_password'
  private static readonly PASSWORD_RESET_EXPIRES_MINUTES = 15
  private static readonly REFRESH_TOKEN_EXPIRES = '30d'

  constructor(
    private readonly mongoService: MongoService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto, requestId: string | null): Promise<ApiResponse<LoginResponseData>> {
    try {
      const normalizedIdentifier = this.resolveLoginIdentifier(dto)
      if (!normalizedIdentifier) {
        return this.errorResponse(
          requestId,
          'VALIDATION_FAILED',
          'identifier, username, or email is required'
        )
      }

      const db = await this.getDb()
      const users = this.userProfiles(db)
      const user = await users.findOne(
        normalizedIdentifier.type === 'email'
          ? { email: normalizedIdentifier.value }
          : { username: normalizedIdentifier.value }
      )

      if (!user || !user.passwordHash || !this.verifyPassword(dto.password, user.passwordHash)) {
        return this.errorResponse(requestId, 'AUTH_INVALID_CREDENTIALS', 'Sai tai khoan hoac mat khau')
      }

      if (user.isActive === false) {
        return this.errorResponse(requestId, 'AUTH_FORBIDDEN', 'Tai khoan da bi khoa')
      }

      const tokens = await this.issueAuthTokens(db, user)

      return successResponse(
        {
          user: this.toUserResponse(user),
          token: tokens.token,
          refreshToken: tokens.refreshToken,
        },
        requestId
      )
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async register(dto: RegisterDto, requestId: string | null): Promise<ApiResponse<RegisterResponseData>> {
    try {
      const username = this.normalizeUsername(dto.username)
      const email = this.normalizeEmail(dto.email)
      const displayName = dto.displayName?.trim() || username
      const db = await this.getDb()
      const users = this.userProfiles(db)

      const existingUser = await users.findOne({ $or: [{ username }, { email }] })
      if (existingUser) {
        return this.errorResponse(
          requestId,
          'DB_CONSTRAINT_VIOLATION',
          'Username hoac email da duoc su dung'
        )
      }

      const now = new Date()
      const user: UserProfileDocument = {
        _id: this.generateUserId(),
        username,
        email,
        displayName,
        passwordHash: this.hashPassword(dto.password),
        isActive: true,
        isVerified: false,
        role: Role.USER,
        createdAt: now,
        updatedAt: now,
      }

      await users.insertOne(user)
      await this.seedUserDocuments(db, user._id, now)

      const tokens = await this.issueAuthTokens(db, user)

      return successResponse(
        {
          user: this.toUserResponse(user),
          token: tokens.token,
          refreshToken: tokens.refreshToken,
        },
        requestId
      )
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return this.errorResponse(
          requestId,
          'DB_CONSTRAINT_VIOLATION',
          'Username hoac email da duoc su dung'
        )
      }

      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async logout(
    dto: LogoutDto | undefined,
    authUser: unknown,
    requestId: string | null
  ): Promise<ApiResponse<LogoutResponseData>> {
    try {
      const userId = this.extractUserId(authUser)
      if (!userId) {
        return this.errorResponse(requestId, 'AUTH_FORBIDDEN', 'Khong xac dinh duoc nguoi dung')
      }

      const db = await this.getDb()
      const refreshTokens = this.refreshTokens(db)
      const now = new Date()

      if (dto?.refreshToken) {
        const tokenHash = this.hashToken(dto.refreshToken)
        await refreshTokens.updateOne(
          { userId, tokenHash, revokedAt: null },
          { $set: { revokedAt: now, updatedAt: now } }
        )
      } else {
        await refreshTokens.updateMany(
          { userId, revokedAt: null },
          { $set: { revokedAt: now, updatedAt: now } }
        )
      }

      return successResponse({ message: 'Dang xuat thanh cong' }, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async refresh(dto: RefreshTokenDto, requestId: string | null): Promise<ApiResponse<RefreshResponseData>> {
    try {
      let payload: JwtRefreshPayload

      try {
        payload = this.jwtService.verify<JwtRefreshPayload>(dto.refreshToken, {
          secret: env.jwtRefreshSecret,
        })
      } catch (_error) {
        return this.errorResponse(requestId, 'AUTH_TOKEN_EXPIRED', 'Token da het han')
      }

      if (payload.type !== 'refresh' || !payload.sub) {
        return this.errorResponse(requestId, 'AUTH_TOKEN_EXPIRED', 'Refresh token khong hop le')
      }

      const db = await this.getDb()
      const refreshTokens = this.refreshTokens(db)
      const tokenHash = this.hashToken(dto.refreshToken)
      const refreshTokenDoc = await refreshTokens.findOne({
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
      })

      if (!refreshTokenDoc || refreshTokenDoc.expiresAt.getTime() <= Date.now()) {
        return this.errorResponse(requestId, 'AUTH_TOKEN_EXPIRED', 'Refresh token da het han')
      }

      const user = await this.userProfiles(db).findOne({ _id: payload.sub })
      if (!user || user.isActive === false) {
        return this.errorResponse(requestId, 'AUTH_FORBIDDEN', 'Khong co quyen truy cap')
      }

      const now = new Date()
      await refreshTokens.updateOne(
        { tokenHash, userId: payload.sub, revokedAt: null },
        { $set: { revokedAt: now, updatedAt: now } }
      )

      const newTokens = await this.issueAuthTokens(db, user)

      return successResponse(
        {
          token: newTokens.token,
          refreshToken: newTokens.refreshToken,
        },
        requestId
      )
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    requestId: string | null
  ): Promise<ApiResponse<ForgotPasswordResponseData>> {
    try {
      const email = this.normalizeEmail(dto.email)
      const message = 'Neu email ton tai, huong dan dat lai mat khau da duoc gui'
      const db = await this.getDb()
      const user = await this.userProfiles(db).findOne({ email })

      if (!user) {
        return successResponse({ message }, requestId)
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + IdentityService.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000)
      const resetToken = randomBytes(32).toString('hex')
      const tokenHash = this.hashToken(resetToken)

      const resetTokens = this.passwordResetTokens(db)
      await resetTokens.updateMany(
        {
          userId: user._id,
          purpose: IdentityService.PASSWORD_RESET_PURPOSE,
          usedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            usedAt: now,
            updatedAt: now,
          },
        }
      )

      await resetTokens.insertOne({
        userId: user._id,
        purpose: IdentityService.PASSWORD_RESET_PURPOSE,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const data: ForgotPasswordResponseData = { message }
      if (env.nodeEnv !== 'production') {
        data.resetToken = resetToken
        data.expiresAt = expiresAt.toISOString()
      }

      return successResponse(data, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async resetPassword(
    dto: ResetPasswordDto,
    requestId: string | null
  ): Promise<ApiResponse<ResetPasswordResponseData>> {
    try {
      const tokenHash = this.hashToken(dto.token)
      const now = new Date()
      const db = await this.getDb()
      const resetTokens = this.passwordResetTokens(db)
      const resetTokenDoc = await resetTokens.findOne({
        tokenHash,
        purpose: IdentityService.PASSWORD_RESET_PURPOSE,
        usedAt: null,
        expiresAt: { $gt: now },
      })

      if (!resetTokenDoc) {
        return this.errorResponse(requestId, 'AUTH_TOKEN_EXPIRED', 'Token dat lai mat khau khong hop le hoac da het han')
      }

      const users = this.userProfiles(db)
      const user = await users.findOne({ _id: resetTokenDoc.userId })
      if (!user) {
        return this.errorResponse(requestId, 'NOT_FOUND', 'Khong tim thay nguoi dung')
      }

      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash: this.hashPassword(dto.password),
            updatedAt: now,
          },
        }
      )

      await resetTokens.updateOne(
        { tokenHash, userId: user._id, usedAt: null },
        { $set: { usedAt: now, updatedAt: now } }
      )

      await this.refreshTokens(db).updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: now, updatedAt: now } }
      )

      return successResponse({ message: 'Dat lai mat khau thanh cong' }, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async checkUsername(
    dto: CheckUsernameDto,
    requestId: string | null
  ): Promise<ApiResponse<AvailabilityResponseData>> {
    try {
      const username = this.normalizeUsername(dto.username)
      const db = await this.getDb()
      const exists = (await this.userProfiles(db).countDocuments({ username }, { limit: 1 })) > 0
      return successResponse({ available: !exists }, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async checkEmail(dto: CheckEmailDto, requestId: string | null): Promise<ApiResponse<AvailabilityResponseData>> {
    try {
      const email = this.normalizeEmail(dto.email)
      const db = await this.getDb()
      const exists = (await this.userProfiles(db).countDocuments({ email }, { limit: 1 })) > 0
      return successResponse({ available: !exists }, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  async me(authUser: unknown, requestId: string | null): Promise<ApiResponse<MeResponseData>> {
    try {
      const userId = this.extractUserId(authUser)
      if (!userId) {
        return this.errorResponse(requestId, 'AUTH_FORBIDDEN', 'Khong xac dinh duoc nguoi dung')
      }

      const db = await this.getDb()
      const user = await this.userProfiles(db).findOne({ _id: userId })
      if (!user) {
        return this.errorResponse(requestId, 'NOT_FOUND', 'Khong tim thay nguoi dung')
      }

      return successResponse({ user: this.toUserResponse(user) }, requestId)
    } catch (_error) {
      return this.errorResponse(requestId, 'INTERNAL_SERVER_ERROR', 'Loi he thong noi bo')
    }
  }

  private async getDb(): Promise<Db> {
    return this.mongoService.connect()
  }

  private userProfiles(db: Db): Collection<UserProfileDocument> {
    return db.collection<UserProfileDocument>('user_profiles')
  }

  private refreshTokens(db: Db): Collection<RefreshTokenDocument> {
    return db.collection<RefreshTokenDocument>('refresh_tokens')
  }

  private passwordResetTokens(db: Db): Collection<PasswordResetTokenDocument> {
    return db.collection<PasswordResetTokenDocument>('email_verification_tokens')
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase()
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  private resolveLoginIdentifier(dto: LoginDto): { type: 'email' | 'username'; value: string } | null {
    if (dto.email?.trim()) {
      return { type: 'email', value: this.normalizeEmail(dto.email) }
    }

    const rawValue = dto.identifier?.trim() || dto.username?.trim()
    if (!rawValue) {
      return null
    }

    if (rawValue.includes('@')) {
      return { type: 'email', value: this.normalizeEmail(rawValue) }
    }

    return { type: 'username', value: this.normalizeUsername(rawValue) }
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(password, salt, 64).toString('hex')
    return `${salt}:${hash}`
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) {
      return false
    }

    const hashBuffer = Buffer.from(hash, 'hex')
    const candidateBuffer = scryptSync(password, salt, 64)
    if (hashBuffer.length !== candidateBuffer.length) {
      return false
    }

    return timingSafeEqual(hashBuffer, candidateBuffer)
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private extractUserId(authUser: unknown): string | null {
    if (!authUser || typeof authUser !== 'object') {
      return null
    }

    const payload = authUser as AuthUserPayload
    const candidate = payload.sub || payload.id || payload.userId
    if (!candidate || typeof candidate !== 'string') {
      return null
    }

    return candidate
  }

  private toUserResponse(user: UserProfileDocument): UserResponseData {
    return {
      id: user._id,
      username: user.username,
      email: user.email || null,
      displayName: user.displayName || null,
      isActive: user.isActive !== false,
      isVerified: user.isVerified === true,
      role: this.resolveRole(user.role),
      createdAt: this.toIsoString(user.createdAt),
      updatedAt: this.toIsoString(user.updatedAt),
    }
  }

  private toIsoString(value?: Date | string): string {
    if (!value) {
      return new Date().toISOString()
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) {
      return new Date().toISOString()
    }

    return parsedDate.toISOString()
  }

  private resolveRole(role?: string): Role {
    if (role === Role.MOD) return Role.MOD
    if (role === Role.ADMIN) return Role.ADMIN
    return Role.USER
  }

  private async issueAuthTokens(db: Db, user: UserProfileDocument): Promise<{ token: string; refreshToken: string }> {
    const role = this.resolveRole(user.role)
    const token = this.jwtService.sign(
      {
        sub: user._id,
        username: user.username,
        role,
      },
      {
        secret: env.jwtAccessSecret,
        expiresIn: '15m',
      }
    )

    const sessionId = randomUUID()
    const refreshToken = this.jwtService.sign(
      {
        sub: user._id,
        sid: sessionId,
        type: 'refresh',
      },
      {
        secret: env.jwtRefreshSecret,
        expiresIn: IdentityService.REFRESH_TOKEN_EXPIRES,
      }
    )

    const refreshTokenExpiresAt = this.extractTokenExpiry(refreshToken)
    const now = new Date()

    await this.refreshTokens(db).insertOne({
      tokenHash: this.hashToken(refreshToken),
      userId: user._id,
      sessionId,
      expiresAt: refreshTokenExpiresAt,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    })

    return { token, refreshToken }
  }

  private extractTokenExpiry(token: string): Date {
    const payload = this.jwtService.decode(token)
    if (!payload || typeof payload !== 'object') {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    const maybeExp = (payload as { exp?: unknown }).exp
    if (typeof maybeExp !== 'number') {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    return new Date(maybeExp * 1000)
  }

  private async seedUserDocuments(db: Db, userId: string, now: Date): Promise<void> {
    await Promise.all([
      db.collection<{ _id: string }>('user_settings').updateOne(
        { _id: userId },
        {
          $setOnInsert: {
            _id: userId,
            theme: 'system',
            soundEnabled: true,
            boardTheme: 'classic',
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
      db.collection<{ userId: string }>('user_stats').updateOne(
        { userId },
        {
          $setOnInsert: {
            userId,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            totalPlayTimeSeconds: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
      db.collection<{ _id: string }>('user_ratings').updateOne(
        { _id: userId },
        {
          $setOnInsert: {
            _id: userId,
            rankedElo: 1200,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
    ])
  }

  private generateUserId(): string {
    return `usr_${randomUUID().replace(/-/g, '')}`
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    return (error as { code?: unknown }).code === 11000
  }

  private errorResponse<T>(
    requestId: string | null,
    code: string,
    message: string,
    details?: unknown
  ): ApiResponse<T> {
    const error = details === undefined ? { code, message } : { code, message, details }
    return {
      success: false,
      data: null,
      error,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    }
  }
}
