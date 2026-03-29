import { Body, Controller, Get, Headers, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { RolesGuard } from '../../shared/auth/roles.guard'
import { Roles } from '../../shared/auth/roles.decorator'
import { Role } from '../../shared/auth/roles.enum'
import { ApiResponse, successResponse } from '../../shared/http/response.util'
import { GetGamesQueryDto } from './dto/get-games.query.dto'
import { GetLeaderboardQueryDto } from './dto/get-leaderboard.query.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { UpdatePasswordDto } from './dto/update-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UploadAvatarDto } from './dto/upload-avatar.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { LeaderboardResponse, ProfileService, UserGamesResponse } from './profile.service'

const errorResponse = (
  requestId: string,
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

  private resolveRequestId(requestId?: string): string {
    const normalized = requestId?.trim()
    return normalized && normalized.length > 0 ? normalized : randomUUID()
  }

  @Post('auth/verify-email')
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; verifiedAt: string } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.verifyEmail(body)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Post('auth/resend-verification')
  async resendVerification(
    @Body() body: ResendVerificationDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; expiresAt: string } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.resendVerification(body)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Get('users/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: { user?: unknown },
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; username: string; displayName: string | null; isVerified: boolean; isActive: boolean } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.getProfile(req.user)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Put('users/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: { user?: unknown },
    @Body() body: UpdateProfileDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; username: string; displayName: string | null; updatedAt: string } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.updateProfile(req.user, body)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Put('users/password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(
    @Req() req: { user?: unknown },
    @Body() body: UpdatePasswordDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; changedAt: string } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.updatePassword(req.user, body)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Post('users/avatar')
  @UseGuards(JwtAuthGuard)
  async uploadAvatar(
    @Req() req: { user?: unknown },
    @Body() body: UploadAvatarDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; avatarUrl: string; avatarPublicId: string | null; updatedAt: string } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.uploadAvatar(req.user, body)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Get('users/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Req() req: { user?: unknown },
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<{ userId: string; totalGames: number; wins: number; losses: number; draws: number; winRate: number; rating: number | null; peakRating: number | null; updatedAt: string | null } | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.getStats(req.user)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Get('users/leaderboard')
  async getLeaderboard(
    @Query() query: GetLeaderboardQueryDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<LeaderboardResponse | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.getLeaderboard(query)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }

  @Get('games')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.MOD, Role.ADMIN)
  async getGames(
    @Req() req: { user?: unknown },
    @Query() query: GetGamesQueryDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<UserGamesResponse | null>> {
    const resolvedRequestId = this.resolveRequestId(requestId)
    const result = await this.profileService.getGames(req.user, query)
    if (!result.ok) {
      return errorResponse(resolvedRequestId, result.error.code, result.error.message, result.error.details)
    }

    return successResponse(result.data, resolvedRequestId)
  }
}
