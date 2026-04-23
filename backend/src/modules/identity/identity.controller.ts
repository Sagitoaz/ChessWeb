import { Body, Controller, Get, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { ApiResponse } from '../../shared/http/response.util'
import { env } from '../../shared/config/env'
import {
  CheckEmailDto,
  CheckUsernameDto,
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/identity.dto'
import { IdentityService } from './identity.service'

@Controller('auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  private readCookie(request: { headers?: Record<string, unknown> }, cookieName: string): string | null {
    const rawCookie = request?.headers?.cookie
    if (typeof rawCookie !== 'string' || rawCookie.trim().length === 0) {
      return null
    }

    const parts = rawCookie.split(';')
    for (const part of parts) {
      const [key, ...valueParts] = part.trim().split('=')
      if (key !== cookieName) continue
      const value = valueParts.join('=').trim()
      if (!value) return null
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }

    return null
  }

  private refreshCookieOptions(remember: boolean) {
    const base = {
      httpOnly: true,
      secure: env.authRefreshCookieSecure,
      sameSite: env.authRefreshCookieSameSite,
      path: env.authRefreshCookiePath,
    } as Record<string, unknown>

    if (env.authRefreshCookieDomain) {
      base.domain = env.authRefreshCookieDomain
    }

    if (remember) {
      base.maxAge = env.authRefreshCookieMaxAgeMs
    }

    return base
  }

  private clearRefreshCookie(response: { clearCookie: Function }) {
    response.clearCookie(
      env.authRefreshCookieName,
      this.refreshCookieOptions(true),
    )
  }

  private setRefreshCookie(
    response: { cookie: Function },
    refreshToken: string,
    remember: boolean,
  ) {
    response.cookie(
      env.authRefreshCookieName,
      refreshToken,
      this.refreshCookieOptions(remember),
    )
  }

  private stripRefreshToken<T extends { refreshToken?: string }>(
    response: ApiResponse<T>,
  ): ApiResponse<Omit<T, 'refreshToken'>> {
    if (!response?.success || !response.data) {
      return response as unknown as ApiResponse<Omit<T, 'refreshToken'>>
    }

    const { refreshToken: _refreshToken, ...safeData } = response.data
    return {
      ...response,
      data: safeData as Omit<T, 'refreshToken'>,
    }
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: { cookie: Function },
    @Headers('x-request-id') requestId?: string
  ): Promise<
    ApiResponse<{
      user: {
        id: string
        username: string
        email: string | null
        displayName: string | null
        isActive: boolean
        isVerified: boolean
        role: string
        createdAt: string
        updatedAt: string
      }
      token: string
    }>
  > {
    const result = await this.identityService.login(dto, requestId || null)
    if (result.success && result.data?.refreshToken) {
      this.setRefreshCookie(response, result.data.refreshToken, dto.remember !== false)
    }
    return this.stripRefreshToken(result)
  }

  @HttpCode(200)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: { cookie: Function },
    @Headers('x-request-id') requestId?: string
  ): Promise<
    ApiResponse<{
      user: {
        id: string
        username: string
        email: string | null
        displayName: string | null
        isActive: boolean
        isVerified: boolean
        role: string
        createdAt: string
        updatedAt: string
      }
      token: string
    }>
  > {
    const result = await this.identityService.register(dto, requestId || null)
    if (result.success && result.data?.refreshToken) {
      this.setRefreshCookie(response, result.data.refreshToken, true)
    }
    return this.stripRefreshToken(result)
  }

  @HttpCode(200)
  @Post('google')
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) response: { cookie: Function },
    @Headers('x-request-id') requestId?: string
  ): Promise<
    ApiResponse<{
      user: {
        id: string
        username: string
        email: string | null
        displayName: string | null
        isActive: boolean
        isVerified: boolean
        role: string
        createdAt: string
        updatedAt: string
      }
      token: string
    }>
  > {
    const result = await this.identityService.googleAuth(dto, requestId || null)
    if (result.success && result.data?.refreshToken) {
      this.setRefreshCookie(response, result.data.refreshToken, true)
    }
    return this.stripRefreshToken(result)
  }

  @HttpCode(200)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: { user?: unknown },
    @Res({ passthrough: true }) response: { clearCookie: Function },
    @Body() dto: LogoutDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    const tokenFromCookie = this.readCookie(request as { headers?: Record<string, unknown> }, env.authRefreshCookieName)
    const result = await this.identityService.logout(
      {
        ...dto,
        refreshToken: dto?.refreshToken || tokenFromCookie || undefined,
      },
      request.user,
      requestId || null
    )
    this.clearRefreshCookie(response)
    return result
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() request: { headers?: Record<string, unknown> },
    @Res({ passthrough: true }) response: { cookie: Function; clearCookie: Function },
    @Body() dto: RefreshTokenDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ token: string; user: {
        id: string
        username: string
        email: string | null
        displayName: string | null
        isActive: boolean
        isVerified: boolean
        role: string
        createdAt: string
        updatedAt: string
      } }>> {
    const tokenFromCookie = this.readCookie(request, env.authRefreshCookieName)
    const result = await this.identityService.refresh(
      {
        refreshToken: dto?.refreshToken || tokenFromCookie || undefined,
      },
      requestId || null
    )
    if (result.success && result.data?.refreshToken) {
      this.setRefreshCookie(response, result.data.refreshToken, true)
    } else {
      this.clearRefreshCookie(response)
    }
    return this.stripRefreshToken(result)
  }

  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ message: string; resetToken?: string; expiresAt?: string }>> {
    return this.identityService.forgotPassword(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('reset-password')
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.identityService.resetPassword(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('check-username')
  checkUsername(
    @Body() dto: CheckUsernameDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    return this.identityService.checkUsername(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('check-email')
  checkEmail(
    @Body() dto: CheckEmailDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    return this.identityService.checkEmail(dto, requestId || null)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @Req() request: { user?: unknown },
    @Headers('x-request-id') requestId?: string
  ): Promise<
    ApiResponse<{
      user: {
        id: string
        username: string
        email: string | null
        displayName: string | null
        isActive: boolean
        isVerified: boolean
        role: string
        createdAt: string
        updatedAt: string
      }
    }>
  > {
    return this.identityService.me(request.user, requestId || null)
  }
}
