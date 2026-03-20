import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { notImplementedResponse, ApiResponse } from '../../shared/http/response.util'

const OWNER = 'member3_ranked_tournament_core'
const MODULE = 'competition'

@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitionController {
  @Post('ranked/queue/join')
  joinQueue(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /ranked/queue/join')
  }

  @Post('ranked/queue/leave')
  leaveQueue(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /ranked/queue/leave')
  }

  @Get('ranked/matches/:id')
  getRankedMatch(@Param('id') _id: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /ranked/matches/:id')
  }

  @Get('ranked/history')
  getRankedHistory(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /ranked/history')
  }

  @Get('ranked/stats')
  getRankedStats(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /ranked/stats')
  }

  @Get('tournaments')
  getTournaments(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /tournaments')
  }

  @Post('tournaments')
  createTournament(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /tournaments')
  }

  @Get('tournaments/:id')
  getTournamentById(@Param('id') _id: string, @Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'GET /tournaments/:id')
  }

  @Post('games')
  createGame(@Headers('x-request-id') requestId?: string): ApiResponse<null> {
    return notImplementedResponse(requestId || null, OWNER, MODULE, 'POST /games')
  }
}
