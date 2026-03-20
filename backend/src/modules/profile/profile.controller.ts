import { Controller, Get, Headers, Post, Put, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { RolesGuard } from '../../shared/auth/roles.guard'
import { Roles } from '../../shared/auth/roles.decorator'
import { Role } from '../../shared/auth/roles.enum'
import { notImplementedResponse, ApiResponse } from '../../shared/http/response.util'

const OWNER = 'member2_profile_user_data'
const MODULE = 'profile'

@Controller()
export class ProfileController {
  @Post('auth/verify-email')
  verifyEmail(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/verify-email')
  }

  @Post('auth/resend-verification')
  resendVerification(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/resend-verification')
  }

  @Get('users/profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /users/profile')
  }

  @Put('users/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'PUT /users/profile')
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
