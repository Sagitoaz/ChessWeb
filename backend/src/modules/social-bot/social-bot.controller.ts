import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
import { SaveBotGameDto } from "./dto/save-bot-game.dto";

type AuthRequest = { user?: { sub?: string; userId?: string } };

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

  @Get("games/:id")
  async getGameById(
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.service.getGameById(id);
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
