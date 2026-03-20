import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { notImplementedResponse, ApiResponse } from '../../shared/http/response.util'

const OWNER = 'member4_room_tournament_participation_bot'
const MODULE = 'social_bot'

@Controller()
@UseGuards(JwtAuthGuard)
export class SocialBotController {
  @Post('rooms')
  createRoom(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /rooms')
  }

  @Post('rooms/:code/join')
  joinRoom(@Param('code') _code: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /rooms/:code/join')
  }

  @Get('rooms/:code')
  getRoom(@Param('code') _code: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /rooms/:code')
  }

  @Post('rooms/:code/leave')
  leaveRoom(@Param('code') _code: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /rooms/:code/leave')
  }

  @Post('tournaments/:id/join')
  joinTournament(@Param('id') _id: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /tournaments/:id/join')
  }

  @Post('tournaments/:id/withdraw')
  withdrawTournament(@Param('id') _id: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /tournaments/:id/withdraw')
  }

  @Post('bot/games')
  createBotGame(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /bot/games')
  }

  @Post('bot/move')
  moveBot(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /bot/move')
  }

  @Get('games/:id')
  getGameById(@Param('id') _id: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /games/:id')
  }
}
