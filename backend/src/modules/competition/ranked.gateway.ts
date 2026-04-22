import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { env } from "../../shared/config/env";
import { CompetitionService } from "./competition.service";
import {
  CompleteRankedMatchDto,
  JoinRankedQueueDto,
  PreferredColor,
  RankedMatchCompletionResult,
  RankedTimeControl,
} from "./dto/competition.dto";

type SocketUser = {
  userId: string;
  role?: string;
  roles?: string[];
};

type RankedJoinPayload = {
  timeControl?: RankedTimeControl;
  preferredColor?: PreferredColor;
};

type GameJoinPayload = {
  matchId?: string;
};

type GameMovePayload = {
  matchId?: string;
  move?: {
    from?: string;
    to?: string;
    promotion?: string;
    san?: string;
  };
};

type GameChatPayload = {
  matchId?: string;
  text?: string;
  messageId?: string;
};

type GameResignPayload = {
  matchId?: string;
};

type GameDrawPayload = {
  matchId?: string;
};

type GameEndPayload = {
  matchId: string;
  reason: string;
  result: string;
  at: string;
  resignedByUserId?: string;
};

@WebSocketGateway({
  cors: {
    origin: env.corsOrigins,
    credentials: true,
  },
})
export class RankedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly matchBySocketId = new Map<string, string>();
  private readonly matchmakingTickMs = 3000;
  private matchmakingTimer: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(RankedGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly competitionService: CompetitionService,
  ) {
    this.matchmakingTimer = setInterval(() => {
      void this.runMatchmakingCycle();
    }, this.matchmakingTickMs);
  }

  emitTournamentPlayerRegistered(payload: {
    tournamentId: string;
    userId: string;
    status?: string;
  }): void {
    this.server.emit("tournament:playerRegistered", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitTournamentPlayerWithdrawn(payload: {
    tournamentId: string;
    userId: string;
  }): void {
    this.server.emit("tournament:playerWithdrawn", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitTournamentStarted(payload: {
    tournamentId: string;
    status?: string;
    rounds?: unknown;
  }): void {
    this.server.emit("tournament:started", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitTournamentRoundUpdate(payload: {
    tournamentId: string;
    roundIndex?: number;
    status?: string;
    rounds?: unknown;
  }): void {
    this.server.emit("tournament:roundUpdate", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitTournamentMatchReady(payload: {
    tournamentId: string;
    matchId: string;
    gameId?: string | null;
    roundIndex?: number;
  }): void {
    this.server.emit("tournament:matchReady", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitTournamentCompleted(payload: {
    tournamentId: string;
    winner?: string | null;
    status?: string;
    rounds?: unknown;
  }): void {
    this.server.emit("tournament:completed", {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  emitRoomPlayerJoined(payload: {
    roomCode: string;
    code?: string;
    userId: string;
    username?: string | null;
    playerCount?: number;
    maxPlayers?: number;
    status?: string;
  }): void {
    this.server.emit("room:playerJoined", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
      at: new Date().toISOString(),
    });
  }

  emitRoomPlayerLeft(payload: {
    roomCode: string;
    code?: string;
    userId: string;
    username?: string | null;
    playerCount?: number;
    maxPlayers?: number;
    status?: string;
  }): void {
    this.server.emit("room:playerLeft", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
      at: new Date().toISOString(),
    });
  }

  emitRoomGameStarted(payload: {
    roomCode: string;
    code?: string;
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
    status?: string;
  }): void {
    this.server.emit("room:gameStarted", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
      at: new Date().toISOString(),
    });
  }

  emitRoomCancelled(payload: {
    roomCode: string;
    code?: string;
    cancelledByUserId?: string;
    reason?: string;
  }): void {
    this.server.emit("room:cancelled", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
      at: new Date().toISOString(),
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = this.authenticateClient(client);
      client.data.user = user;

      const socketSet =
        this.socketsByUser.get(user.userId) || new Set<string>();
      socketSet.add(client.id);
      this.socketsByUser.set(user.userId, socketSet);

      const waitingCount = await this.competitionService.getWaitingQueueCount();
      this.server.emit("ranked:queueUpdate", { playersInQueue: waitingCount });
      this.logger.log(
        `Socket connected: user=${user.userId} socket=${client.id} waiting=${waitingCount}`,
      );
    } catch (_error) {
      client.emit("ranked:error", {
        message: "Unauthorized socket connection",
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as SocketUser | undefined;
    const activeMatchId = this.matchBySocketId.get(client.id) || null;
    this.matchBySocketId.delete(client.id);

    if (!user?.userId) return;

    const socketSet = this.socketsByUser.get(user.userId);
    if (!socketSet) return;

    socketSet.delete(client.id);
    const userStillConnected = socketSet.size > 0;
    if (socketSet.size === 0) {
      this.socketsByUser.delete(user.userId);
    }

    if (!userStillConnected && activeMatchId) {
      let didEmitGameEnd = false;
      try {
        const completion =
          await this.competitionService.completeRankedMatchByDisconnect(
            activeMatchId,
            user.userId,
          );

        if (completion) {
          const payload: GameEndPayload = {
            matchId: activeMatchId,
            reason: "forfeit",
            result: completion.result,
            resignedByUserId: user.userId,
            at: completion.finishedAt,
          };
          this.emitGameEnd(
            activeMatchId,
            {
              whitePlayerId: completion.whitePlayerId,
              blackPlayerId: completion.blackPlayerId,
            },
            payload,
          );
          didEmitGameEnd = true;
        }
      } catch (error) {
        this.logger.warn(
          `Disconnect completion skipped for match=${activeMatchId}: ${(error as Error).message}`,
        );
      }

      if (!didEmitGameEnd) {
        try {
          const roomCompletion =
            await this.competitionService.completeRoomGameByResignation(
              activeMatchId,
              user.userId,
            );
          if (roomCompletion) {
            const participants =
              await this.competitionService.getMatchParticipants(activeMatchId);

            const payload: GameEndPayload = {
              matchId: activeMatchId,
              reason: "disconnect_forfeit",
              result: roomCompletion.result,
              resignedByUserId: user.userId,
              at: roomCompletion.finishedAt,
            };

            this.emitGameEnd(activeMatchId, participants, payload);
          }
        } catch (error) {
          this.logger.warn(
            `Room disconnect completion skipped for match=${activeMatchId}: ${(error as Error).message}`,
          );
        }
      }
    }

    const waitingCount = await this.competitionService.getWaitingQueueCount();
    this.server.emit("ranked:queueUpdate", { playersInQueue: waitingCount });
  }

  @SubscribeMessage("ranked:joinQueue")
  async onJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RankedJoinPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);

    const payload: JoinRankedQueueDto = {
      timeControl: body?.timeControl || RankedTimeControl.BLITZ,
      preferredColor: body?.preferredColor || PreferredColor.RANDOM,
    };

    await this.competitionService.joinQueue(
      { userId: user.userId, roles: user.roles || [] },
      payload,
    );

    await this.runMatchmakingCycle(payload.timeControl);

    const waitingCount = await this.competitionService.getWaitingQueueCount(
      payload.timeControl,
    );
    this.server.emit("ranked:queueUpdate", { playersInQueue: waitingCount });
    this.logger.log(
      `Join queue: user=${user.userId} tc=${payload.timeControl} color=${payload.preferredColor} waiting(tc)=${waitingCount}`,
    );
  }

  @SubscribeMessage("ranked:leaveQueue")
  async onLeaveQueue(@ConnectedSocket() client: Socket): Promise<void> {
    const user = this.getSocketUser(client);

    await this.competitionService.leaveQueue({
      userId: user.userId,
      roles: user.roles || [],
    });

    const waitingCount = await this.competitionService.getWaitingQueueCount();
    this.server.emit("ranked:queueUpdate", { playersInQueue: waitingCount });
    this.logger.log(`Leave queue: user=${user.userId} waiting=${waitingCount}`);
  }

  private async runMatchmakingCycle(
    timeControl?: RankedTimeControl,
  ): Promise<void> {
    try {
      let created = 0;
      let match = await this.competitionService.tryMatchNextPair(timeControl);
      while (match) {
        created += 1;
        this.emitMatchFound(match);
        match = await this.competitionService.tryMatchNextPair(timeControl);
      }

      const waitingCount =
        await this.competitionService.getWaitingQueueCount(timeControl);
      this.server.emit("ranked:queueUpdate", { playersInQueue: waitingCount });
      if (created > 0) {
        this.logger.log(
          `Matchmaking created=${created} tc=${timeControl || "all"} remaining=${waitingCount}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Matchmaking cycle failed (tc=${timeControl || "all"}): ${(error as Error).message}`,
      );
    }
  }

  @SubscribeMessage("game:join")
  async onGameJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameJoinPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    client.join(`match:${matchId}`);
    this.matchBySocketId.set(client.id, matchId);
  }

  @SubscribeMessage("game:move")
  async onGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameMovePayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;
    const move = body?.move;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    this.matchBySocketId.set(client.id, matchId);

    if (!move?.from || !move?.to) {
      return;
    }

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    this.server
      .to(`match:${matchId}`)
      .except(client.id)
      .emit("game:moveUpdate", {
        matchId,
        move,
        byUserId: user.userId,
        at: new Date().toISOString(),
      });
  }

  @SubscribeMessage("game:chat")
  async onGameChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameChatPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;
    const text = String(body?.text || "").trim();

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }
    if (!text) return;

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    const payload = {
      matchId,
      text: text.slice(0, 500),
      fromUserId: user.userId,
      messageId:
        typeof body?.messageId === "string" && body.messageId.length > 0
          ? body.messageId
          : null,
      at: new Date().toISOString(),
    };

    this.server.to(`match:${matchId}`).emit("game:chat", payload);
  }

  @SubscribeMessage("game:resign")
  async onGameResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameResignPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    this.matchBySocketId.set(client.id, matchId);

    const participants =
      await this.competitionService.getMatchParticipants(matchId);
    if (!participants) {
      throw new UnauthorizedException("Match participants not found");
    }

    if (
      user.userId !== participants.whitePlayerId &&
      user.userId !== participants.blackPlayerId
    ) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    const result =
      user.userId === participants.whitePlayerId ? "BlackWin" : "WhiteWin";

    const roomCompletion =
      await this.competitionService.completeRoomGameByResignation(
        matchId,
        user.userId,
      );
    if (roomCompletion) {
      const payload: GameEndPayload = {
        matchId,
        reason: "resignation",
        result: roomCompletion.result,
        resignedByUserId: user.userId,
        at: roomCompletion.finishedAt,
      };
      this.emitGameEnd(matchId, participants, payload);
      return;
    }

    try {
      const completionPayload: CompleteRankedMatchDto = {
        reason: "resignation",
        result:
          user.userId === participants.whitePlayerId
            ? RankedMatchCompletionResult.BLACK_WIN
            : RankedMatchCompletionResult.WHITE_WIN,
      };

      const completion = await this.competitionService.completeRankedMatch(
        { userId: user.userId, roles: user.roles || [] },
        matchId,
        completionPayload,
      );

      const payload: GameEndPayload = {
        matchId,
        reason: "resignation",
        result: String(completion.result),
        resignedByUserId: user.userId,
        at: new Date().toISOString(),
      };
      this.emitGameEnd(matchId, participants, payload);
      return;
    } catch {
      const payload: GameEndPayload = {
        matchId,
        reason: "resignation",
        result,
        resignedByUserId: user.userId,
        at: new Date().toISOString(),
      };
      this.emitGameEnd(matchId, participants, payload);
    }
  }

  @SubscribeMessage("game:offerDraw")
  async onGameOfferDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameDrawPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    this.server
      .to(`match:${matchId}`)
      .except(client.id)
      .emit("game:drawOffer", {
        matchId,
        type: "offer",
        fromUserId: user.userId,
        at: new Date().toISOString(),
      });
  }

  @SubscribeMessage("game:acceptDraw")
  async onGameAcceptDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameDrawPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    this.server.to(`match:${matchId}`).emit("game:drawOffer", {
      matchId,
      type: "accepted",
      byUserId: user.userId,
      at: new Date().toISOString(),
    });

    const participants =
      await this.competitionService.getMatchParticipants(matchId);

    try {
      const completion = await this.competitionService.completeRankedMatch(
        { userId: user.userId, roles: user.roles || [] },
        matchId,
        {
          result: RankedMatchCompletionResult.DRAW,
          reason: "draw_agreement",
        },
      );

      const payload: GameEndPayload = {
        matchId,
        reason: "draw_agreement",
        result: String(completion.result),
        at: new Date().toISOString(),
      };
      this.emitGameEnd(matchId, participants, payload);
      return;
    } catch {
      const payload: GameEndPayload = {
        matchId,
        reason: "draw_agreement",
        result: RankedMatchCompletionResult.DRAW,
        at: new Date().toISOString(),
      };
      this.emitGameEnd(matchId, participants, payload);
    }
  }

  @SubscribeMessage("game:declineDraw")
  async onGameDeclineDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameDrawPayload | undefined,
  ): Promise<void> {
    const user = this.getSocketUser(client);
    const matchId = body?.matchId;

    if (!matchId || typeof matchId !== "string") {
      throw new UnauthorizedException("Missing matchId");
    }

    const allowed = await this.competitionService.isUserInMatch(
      matchId,
      user.userId,
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not a participant of this match",
      );
    }

    this.server.to(`match:${matchId}`).emit("game:drawOffer", {
      matchId,
      type: "declined",
      byUserId: user.userId,
      at: new Date().toISOString(),
    });
  }

  private emitMatchFound(match: {
    matchId: string;
    white: { userId: string; username: string; rating: number };
    black: { userId: string; username: string; rating: number };
  }) {
    const whiteSockets =
      this.socketsByUser.get(match.white.userId) || new Set<string>();
    const blackSockets =
      this.socketsByUser.get(match.black.userId) || new Set<string>();

    for (const socketId of whiteSockets) {
      this.server.to(socketId).emit("ranked:matchFound", {
        matchId: match.matchId,
        color: "white",
        opponent: {
          userId: match.black.userId,
          username: match.black.username,
          rating: match.black.rating,
        },
      });
    }

    for (const socketId of blackSockets) {
      this.server.to(socketId).emit("ranked:matchFound", {
        matchId: match.matchId,
        color: "black",
        opponent: {
          userId: match.white.userId,
          username: match.white.username,
          rating: match.white.rating,
        },
      });
    }
  }

  private emitGameEnd(
    matchId: string,
    participants: { whitePlayerId: string; blackPlayerId: string } | null,
    payload: GameEndPayload,
  ): void {
    this.server.to(`match:${matchId}`).emit("game:end", payload);

    if (!participants) return;

    const whiteSockets = this.socketsByUser.get(participants.whitePlayerId);
    const blackSockets = this.socketsByUser.get(participants.blackPlayerId);

    for (const socketId of whiteSockets || []) {
      this.server.to(socketId).emit("game:end", payload);
    }

    for (const socketId of blackSockets || []) {
      this.server.to(socketId).emit("game:end", payload);
    }
  }

  private authenticateClient(client: Socket): SocketUser {
    const authToken = client.handshake.auth?.token;
    const header = client.handshake.headers?.authorization;

    const rawToken =
      typeof authToken === "string" && authToken.trim().length > 0
        ? authToken
        : typeof header === "string" && header.startsWith("Bearer ")
          ? header.slice(7)
          : null;

    if (!rawToken) {
      throw new UnauthorizedException("Missing socket token");
    }

    try {
      const payload = this.jwtService.verify(rawToken, {
        secret: env.jwtAccessSecret,
      }) as SocketUser & {
        sub?: string;
        userId?: string;
      };

      const userId = payload.sub || payload.userId;
      if (!userId || typeof userId !== "string") {
        throw new UnauthorizedException("Invalid socket token payload");
      }

      return {
        userId,
        role: payload.role,
        roles: Array.isArray(payload.roles)
          ? payload.roles
          : payload.role
            ? [payload.role]
            : [],
      };
    } catch (_error) {
      throw new UnauthorizedException("Invalid socket token");
    }
  }

  private getSocketUser(client: Socket): SocketUser {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.userId) {
      throw new UnauthorizedException("Socket user context not found");
    }
    return user;
  }
}
