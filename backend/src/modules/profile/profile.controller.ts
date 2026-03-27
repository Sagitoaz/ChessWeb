import { Body, Controller, Get, Headers, Post, Put, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { RolesGuard } from '../../shared/auth/roles.guard'
import { Roles } from '../../shared/auth/roles.decorator'
import { Role } from '../../shared/auth/roles.enum'
import { notImplementedResponse, ApiResponse, successResponse } from '../../shared/http/response.util'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ProfileService } from './profile.service'

const OWNER = 'member2_profile_user_data'
const MODULE = 'profile'

const errorResponse = (
  requestId: string | null,
  code: string,
  message: string,
  details?: unknown
): ApiResponse<null> => ({
  success: false,
  data: null,
  error: {
    code,
    message,
    details,
  },
  meta: {
    requestId,
    timestamp: new Date().toISOString(),
  },
})

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('auth/verify-email')
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; verifiedAt: string } | null>> {
    const result = await this.profileService.verifyEmail(body)
    if (!result.ok) {
      return errorResponse(requestId || null, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, requestId || null)
  }

  @Post('auth/resend-verification')
  async resendVerification(
    @Body() body: ResendVerificationDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; expiresAt: string; tokenPreview?: string } | null>> {
    const result = await this.profileService.resendVerification(body)
    if (!result.ok) {
      return errorResponse(requestId || null, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, requestId || null)
  }

  @Get('users/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: { user?: unknown },
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; username: string; displayName: string | null; isVerified: boolean; isActive: boolean } | null>> {
    const result = await this.profileService.getProfile(req.user)
    if (!result.ok) {
      return errorResponse(requestId || null, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, requestId || null)
  }

  @Put('users/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: { user?: unknown },
    @Body() body: UpdateProfileDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; username: string; displayName: string | null; updatedAt: string } | null>> {
    const result = await this.profileService.updateProfile(req.user, body)
    if (!result.ok) {
      return errorResponse(requestId || null, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, requestId || null)
  }

  @Put('users/password')
  @UseGuards(JwtAuthGuard)
  updatePassword(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'PUT /users/password')
  }

  @Post('users/avatar')
  @UseGuards(JwtAuthGuard)
  uploadAvatar(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /users/avatar')
  }

  @Get('users/stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /users/stats')
  }

  @Get('users/leaderboard')
  getLeaderboard(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /users/leaderboard')
  }

  @Get('games')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.MOD, Role.ADMIN)
  getGames(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /games')
  }
}
