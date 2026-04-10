import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { SocialBotRepository } from "./social-bot.repository";
import { BotMoveDto } from "./dto/bot-move.dto";
import { CreateBotGameDto } from "./dto/create-bot-game.dto";
import { CreateRoomDto } from "./dto/create-room.dto";
import { SaveBotGameDto } from "./dto/save-bot-game.dto";
import { StockfishService } from "./stockfish.service";

@Injectable()
export class SocialBotService {
  constructor(
    private readonly repo: SocialBotRepository,
    private readonly stockfishService: StockfishService,
  ) {}

  private makeRoomCode(): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }

  async createRoom(userId: string, dto: CreateRoomDto) {
    const roomCode = this.makeRoomCode();
    const now = new Date();
    const room = await this.repo.createRoom({
      code: roomCode,
      ownerUserId: userId,
      name: dto.name ?? null,
      timeControl: dto.timeControl ?? "rapid",
      initialTimeSeconds: dto.initialTimeSeconds ?? 600,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    await this.repo.addRoomMember({
      roomId: room._id,
      userId,
      role: "owner",
      joinedAt: now,
    });

    return room;
  }

  async joinRoom(userId: string, code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    const members = await this.repo.findRoomMembers(room._id);
    const alreadyJoined = members.some((m: any) => m.userId === userId);
    if (alreadyJoined) {
      return room;
    }

    await this.repo.addRoomMember({
      roomId: room._id,
      userId,
      role: "member",
      joinedAt: new Date(),
    });

    return room;
  }

  async getRoom(code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }
    const members = await this.repo.findRoomMembers(room._id);
    return { ...room, members };
  }

  async leaveRoom(userId: string, code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    const result = await this.repo.removeRoomMember(room._id, userId);
    if (result.deletedCount === 0) {
      throw new BadRequestException("User is not a member of the room");
    }
    return { left: true };
  }

  async joinTournament(userId: string, tournamentId: string) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    await this.repo.addTournamentParticipant({
      tournamentId: ObjectId.isValid(tournamentId)
        ? new ObjectId(tournamentId)
        : tournamentId,
      userId,
      joinedAt: new Date(),
      status: "active",
    });

    return { joined: true, tournamentId };
  }

  async withdrawTournament(userId: string, tournamentId: string) {
    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const result = await this.repo.removeTournamentParticipant(
      normalizedId,
      userId,
    );
    if (result.deletedCount === 0) {
      throw new BadRequestException(
        "User is not a participant of the tournament",
      );
    }
    return { withdrawn: true, tournamentId };
  }

  async createBotGame(userId: string, dto: CreateBotGameDto) {
    const now = new Date();
    const botSession = await this.repo.createBotSession({
      userId,
      status: "active",
      difficulty: dto.difficulty,
      preferredColor: dto.preferredColor ?? "random",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const game = await this.repo.createGame({
      mode: "bot",
      whitePlayerId: dto.preferredColor === "black" ? "bot" : userId,
      blackPlayerId: dto.preferredColor === "black" ? userId : "bot",
      result: null,
      botSessionId: botSession._id,
      createdAt: now,
      finishedAt: null,
    });

    return {
      gameId: String(game._id),
      sessionId: String(botSession._id),
      difficulty: dto.difficulty,
    };
  }

  async moveBot(userId: string, dto: BotMoveDto) {
    const now = new Date();
    const requestLog = await this.repo.createBotMoveRequest({
      sessionId: ObjectId.isValid(dto.sessionId)
        ? new ObjectId(dto.sessionId)
        : dto.sessionId,
      requestPayload: {
        userId,
        fen: dto.fen,
      },
      responsePayload: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Fetch bot session to get difficulty level
    const session = await this.repo.findBotSessionById(dto.sessionId);
    const difficulty = session?.difficulty || "intermediate";

    const stockfishMove = await this.stockfishService.getBestMove(
      dto.fen,
      difficulty,
    );
    const move = stockfishMove ?? {
      bestMoveUci: "e2e4",
      evaluation: 0.24,
    };

    await this.repo.updateBotMoveRequestResponse(
      requestLog._id as ObjectId,
      move,
      "done",
    );

    return {
      sessionId: dto.sessionId,
      move,
    };
  }

  async getGameById(gameId: string) {
    const game = await this.repo.findGameById(gameId);
    if (!game) {
      throw new NotFoundException("Game not found");
    }
    return game;
  }

  async saveGame(userId: string, gameId: string, payload: SaveBotGameDto) {
    const game = await this.repo.findGameById(gameId);
    if (!game) {
      throw new NotFoundException("Game not found");
    }

    const isWhite = game.whitePlayerId === userId;
    const isBlack = game.blackPlayerId === userId;
    if (!isWhite && !isBlack) {
      throw new BadRequestException("User is not a participant of this game");
    }

    let normalizedResult: "win" | "lose" | "draw" = "draw";
    if (payload.result === "Draw") {
      normalizedResult = "draw";
    } else if (payload.result === "WhiteWin") {
      normalizedResult = isWhite ? "win" : "lose";
    } else if (payload.result === "BlackWin") {
      normalizedResult = isBlack ? "win" : "lose";
    }

    const now = new Date();
    const normalizedMode =
      payload.mode === "HumanVsBot" || payload.mode === "bot" ? "bot" : "bot";

    const updatedGame = await this.repo.updateGameById(gameId, {
      result: normalizedResult,
      rawResult: payload.result,
      state: "Saved",
      mode: normalizedMode,
      moves: Array.isArray(payload.moves) ? payload.moves : [],
      initialFEN: payload.initialFEN || null,
      whitePlayer: payload.whitePlayer || null,
      blackPlayer: payload.blackPlayer || null,
      metadata: payload.metadata || null,
      finishedAt: now,
      updatedAt: now,
    });

    return {
      gameId,
      state: "Saved",
      result: payload.result,
      storedResult: normalizedResult,
      finishedAt: now.toISOString(),
      game: updatedGame,
    };
  }
}
