import { Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { ApiResponse } from '../../shared/http/response.util'
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

  @HttpCode(200)
  @Post('login')
  login(
    @Body() dto: LoginDto,
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
      refreshToken: string
    }>
  > {
    return this.identityService.login(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('register')
  register(
    @Body() dto: RegisterDto,
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
      refreshToken: string
    }>
  > {
    return this.identityService.register(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('google')
  googleAuth(
    @Body() dto: GoogleAuthDto,
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
      refreshToken: string
    }>
  > {
    return this.identityService.googleAuth(dto, requestId || null)
  }

  @HttpCode(200)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Req() request: { user?: unknown },
    @Body() dto: LogoutDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.identityService.logout(dto, request.user, requestId || null)
  }

  @HttpCode(200)
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return this.identityService.refresh(dto, requestId || null)
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
