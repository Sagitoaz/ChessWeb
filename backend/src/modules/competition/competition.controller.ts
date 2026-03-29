import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { ApiResponse, successResponse } from '../../shared/http/response.util'
import { CompetitionService } from './competition.service'
import {
  CreateCompetitionGameDto,
  CreateTournamentDto,
  JoinRankedQueueDto,
  RankedPaginationQueryDto,
  TournamentQueryDto,
} from './dto/competition.dto'

interface AuthenticatedRequest {
  user?: Record<string, unknown>
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Post('ranked/queue/join')
  async joinQueue(
    @Req() request: AuthenticatedRequest,
    @Body() body: JoinRankedQueueDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.joinQueue(user, body)
    return successResponse(result, requestId || null)
  }

  @Post('ranked/queue/leave')
  async leaveQueue(
    @Req() request: AuthenticatedRequest,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.leaveQueue(user)
    return successResponse(result, requestId || null)
  }

  @Get('ranked/matches/:id')
  async getRankedMatch(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const result = await this.competitionService.getRankedMatchById(id)
    return successResponse(result, requestId || null)
  }

  @Get('ranked/history')
  async getRankedHistory(
    @Req() request: AuthenticatedRequest,
    @Query() query: RankedPaginationQueryDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.getRankedHistory(user, query)
    return successResponse(result, requestId || null)
  }

  @Get('ranked/stats')
  async getRankedStats(
    @Req() request: AuthenticatedRequest,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.getRankedStats(user)
    return successResponse(result, requestId || null)
  }

  @Get('tournaments')
  async getTournaments(
    @Query() query: TournamentQueryDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const result = await this.competitionService.getTournaments(query)
    return successResponse(result, requestId || null)
  }

  @Post('tournaments')
  async createTournament(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTournamentDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.createTournament(user, body)
    return successResponse(result, requestId || null)
  }

  @Get('tournaments/:id')
  async getTournamentById(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const result = await this.competitionService.getTournamentById(id)
    return successResponse(result, requestId || null)
  }

  @Post('games')
  async createGame(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateCompetitionGameDto,
    @Headers('x-request-id') requestId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const user = this.competitionService.extractUser(request.user)
    const result = await this.competitionService.createGame(user, body)
    return successResponse(result, requestId || null)
  }
}
