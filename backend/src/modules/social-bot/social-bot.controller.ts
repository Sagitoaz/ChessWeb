import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { successResponse, ApiResponse } from "../../shared/http/response.util";
import { SocialBotService } from "./social-bot.service";
import { BotMoveDto } from "./dto/bot-move.dto";
import { CreateBotGameDto } from "./dto/create-bot-game.dto";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateTournamentMatchResultDto } from "./dto/manage-tournament-result.dto";
import { SaveBotGameDto } from "./dto/save-bot-game.dto";
import { BotTacticalHintDto } from "./dto/bot-tactical-hint.dto";

type AuthRequest = {
  user?: { sub?: string; userId?: string; roles?: string[] };
};

@Controller()
@UseGuards(JwtAuthGuard)
export class SocialBotController {
  constructor(private readonly service: SocialBotService) {}

  private getUserId(req: AuthRequest): string {
    const userId = req.user?.sub || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException("User ID not found in request");
    }
    return userId;
  }

  private getPrincipal(req: AuthRequest) {
    return {
      userId: this.getUserId(req),
      roles: Array.isArray(req.user?.roles)
        ? req.user.roles.filter(
            (role): role is string => typeof role === "string",
          )
        : [],
    };
  }

  @Post("rooms")
  async createRoom(
    @Req() req: AuthRequest,
    @Body() body: CreateRoomDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.createRoom(this.getUserId(req), body);
    return successResponse(data, requestId || null);
  }

  @Post("rooms/:code/join")
  async joinRoom(
    @Req() req: AuthRequest,
    @Param("code") code: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.joinRoom(this.getUserId(req), code);
    return successResponse(data, requestId || null);
  }

  @Get("rooms/:code")
  async getRoom(
    @Param("code") code: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.getRoom(code);
    return successResponse(data, requestId || null);
  }

  @Post("rooms/:code/leave")
  async leaveRoom(
    @Req() req: AuthRequest,
    @Param("code") code: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.leaveRoom(this.getUserId(req), code);
    return successResponse(data, requestId || null);
  }

  @Post("rooms/:code/start")
  async startRoomGame(
    @Req() req: AuthRequest,
    @Param("code") code: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.startRoomGame(this.getUserId(req), code);
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/join")
  async joinTournament(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.joinTournament(this.getUserId(req), id);
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/withdraw")
  async withdrawTournament(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.withdrawTournament(this.getUserId(req), id);
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/start")
  async startTournament(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.startTournament(this.getPrincipal(req), id);
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/cancel")
  async cancelTournament(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.cancelTournament(
      this.getPrincipal(req),
      id,
    );
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/matches/:matchId/result")
  async updateTournamentMatchResult(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Param("matchId") matchId: string,
    @Body() body: UpdateTournamentMatchResultDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.updateTournamentMatchResult(
      this.getPrincipal(req),
      id,
      matchId,
      body,
    );
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/participants/:userId/approve")
  async approveTournamentParticipant(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.approveTournamentParticipant(
      this.getPrincipal(req),
      id,
      userId,
    );
    return successResponse(data, requestId || null);
  }

  @Post("tournaments/:id/participants/:userId/reject")
  async rejectTournamentParticipant(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.rejectTournamentParticipant(
      this.getPrincipal(req),
      id,
      userId,
    );
    return successResponse(data, requestId || null);
  }

  @Post("bot/games")
  async createBotGame(
    @Req() req: AuthRequest,
    @Body() body: CreateBotGameDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.createBotGame(this.getUserId(req), body);
    return successResponse(data, requestId || null);
  }

  @Post("bot/move")
  async moveBot(
    @Req() req: AuthRequest,
    @Body() body: BotMoveDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.moveBot(this.getUserId(req), body);
    return successResponse(data, requestId || null);
  }

  @Post("bot/tactical-hint")
  async getBotTacticalHint(
    @Req() req: AuthRequest,
    @Body() body: BotTacticalHintDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.getBotTacticalHint(
      this.getUserId(req),
      body,
    );
    return successResponse(data, requestId || null);
  }

  @Get("games/:id")
  async getGameById(
    @Param("id") id: string,
    @Query("analyzeFen") analyzeFen?: string,
    @Query("userMove") userMove?: string,
    @Query("score") score?: string,
    @Query("refreshAi") refreshAi?: string,
    @Query("playerColor") playerColor?: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.getGameById(id, {
      analyzeFen,
      userMove,
      score:
        typeof score === "string" && score.trim().length > 0
          ? Number(score)
          : undefined,
      refreshAi:
        typeof refreshAi === "string"
          ? ["1", "true", "yes"].includes(refreshAi.toLowerCase())
          : false,
      playerColor,
    });
    return successResponse(data, requestId || null);
  }

  @Post("games/:id/save")
  async saveGame(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: SaveBotGameDto,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.saveGame(this.getUserId(req), id, body);
    return successResponse(data, requestId || null);
  }
}
