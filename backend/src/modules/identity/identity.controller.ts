import { Controller, Get, Headers, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { notImplementedResponse, ApiResponse } from '../../shared/http/response.util'

const OWNER = 'member1_identity_core'
const MODULE = 'identity'

@Controller('auth')
export class IdentityController {
  @Post('login')
  login(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/login')
  }

  @Post('register')
  register(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/register')
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/logout')
  }

  @Post('refresh')
  refresh(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/refresh')
  }

  @Post('forgot-password')
  forgotPassword(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/forgot-password')
  }

  @Post('reset-password')
  resetPassword(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/reset-password')
  }

  @Post('check-username')
  checkUsername(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/check-username')
  }

  @Post('check-email')
  checkEmail(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /auth/check-email')
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /auth/me')
  }
}
