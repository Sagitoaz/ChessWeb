import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, OnModuleDestroy, UnauthorizedException } from "@nestjs/common";
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
    clocks?: {
      whiteTimeMs?: number;
      blackTimeMs?: number;
      whiteTimeSeconds?: number;
      blackTimeSeconds?: number;
    };
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

type GameClockState = {
  matchId: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  turn: "w" | "b";
  running: boolean;
  lastTickAtMs: number;
  turnStartedAtMs: number;
  ending: boolean;
};

type PendingDisconnectForfeit = {
  matchId: string;
  userId: string;
  timer: NodeJS.Timeout;
};

type TournamentRegisterPayload = {
  tournamentId?: string;
};

type RoomJoinPayload = {
  code?: string;
};

@WebSocketGateway({
  cors: {
    origin: env.corsOrigins,
    credentials: true,
  },
})
export class RankedGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly matchBySocketId = new Map<string, string>();
  private readonly matchmakingTickMs = 3000;
  private readonly clockTickMs = 1000;
  private readonly afkAutoLoseMs = 120_000;
  private readonly disconnectAutoLoseMs = 30_000;
  private matchmakingTimer: NodeJS.Timeout | null = null;
  private gameClockTimer: NodeJS.Timeout | null = null;
  private isMatchmakingCycleRunning = false;
  private readonly gameClocks = new Map<string, GameClockState>();
  private readonly pendingDisconnectForfeits = new Map<
    string,
    PendingDisconnectForfeit
  >();
  private readonly logger = new Logger(RankedGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly competitionService: CompetitionService,
  ) {
    this.matchmakingTimer = setInterval(() => {
      void this.runMatchmakingCycle();
    }, this.matchmakingTickMs);
    this.gameClockTimer = setInterval(() => {
      void this.tickGameClocks();
    }, this.clockTickMs);
  }

  onModuleDestroy(): void {
    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
      this.matchmakingTimer = null;
    }
    if (this.gameClockTimer) {
      clearInterval(this.gameClockTimer);
      this.gameClockTimer = null;
    }
    for (const pending of this.pendingDisconnectForfeits.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingDisconnectForfeits.clear();
  }

  private tournamentRoom(tournamentId: string): string {
    return `tournament:${tournamentId}`;
  }

  private roomChannel(roomCode: string): string {
    return `room:${String(roomCode || "").trim().toUpperCase()}`;
  }

  private emitRoomEvent(
    roomCode: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.server.to(this.roomChannel(roomCode)).emit(event, {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  private emitTournamentEvent(
    tournamentId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.server.to(this.tournamentRoom(tournamentId)).emit(event, {
      ...payload,
      tournamentId,
      at: new Date().toISOString(),
    });
  }

  emitTournamentPlayerRegistered(payload: {
    tournamentId: string;
    userId: string;
    status?: string;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:playerRegistered", payload);
  }

  emitTournamentPlayerWithdrawn(payload: {
    tournamentId: string;
    userId: string;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:playerWithdrawn", payload);
  }

  emitTournamentStarted(payload: {
    tournamentId: string;
    status?: string;
    rounds?: unknown;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:started", payload);
  }

  emitTournamentRoundUpdate(payload: {
    tournamentId: string;
    roundIndex?: number;
    status?: string;
    rounds?: unknown;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:roundUpdate", payload);
  }

  emitTournamentMatchReady(payload: {
    tournamentId: string;
    matchId: string;
    gameId?: string | null;
    roundIndex?: number;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:matchReady", payload);
  }

  emitTournamentCompleted(payload: {
    tournamentId: string;
    winner?: string | null;
    status?: string;
    rounds?: unknown;
  }): void {
    this.emitTournamentEvent(payload.tournamentId, "tournament:completed", payload);
  }

  emitGameStatus(
    matchId: string,
    payload: Record<string, unknown> = {},
  ): void {
    this.server.to(`match:${matchId}`).emit("game:status", {
      matchId,
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
    this.emitRoomEvent(payload.roomCode || payload.code || "", "room:playerJoined", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
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
    this.emitRoomEvent(payload.roomCode || payload.code || "", "room:playerLeft", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
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
    this.emitRoomEvent(payload.roomCode || payload.code || "", "room:gameStarted", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
    });
  }

  emitRoomCancelled(payload: {
    roomCode: string;
    code?: string;
    cancelledByUserId?: string;
    reason?: string;
  }): void {
    this.emitRoomEvent(payload.roomCode || payload.code || "", "room:cancelled", {
      ...payload,
      code: payload.code || payload.roomCode,
      roomCode: payload.roomCode || payload.code,
    });
  }

  private async ensureGameClock(matchId: string): Promise<GameClockState> {
    const existing = this.gameClocks.get(matchId);
    if (existing) {
      this.settleGameClock(existing);
      return existing;
    }

    const initialClockMs =
      await this.competitionService.getInitialClockMs(matchId);
    const now = Date.now();
    const clock: GameClockState = {
      matchId,
      whiteTimeMs: initialClockMs,
      blackTimeMs: initialClockMs,
      turn: "w",
      running: true,
      lastTickAtMs: now,
      turnStartedAtMs: now,
      ending: false,
    };
    this.gameClocks.set(matchId, clock);
    return clock;
  }

  private settleGameClock(clock: GameClockState): GameClockState {
    if (!clock.running || clock.ending) return clock;

    const now = Date.now();
    const elapsedMs = Math.max(0, now - clock.lastTickAtMs);
    clock.lastTickAtMs = now;

    if (clock.turn === "w") {
      clock.whiteTimeMs = Math.max(0, clock.whiteTimeMs - elapsedMs);
    } else {
      clock.blackTimeMs = Math.max(0, clock.blackTimeMs - elapsedMs);
    }

    return clock;
  }

  private async applyMoveToGameClock(matchId: string): Promise<GameClockState> {
    const clock = await this.ensureGameClock(matchId);
    this.settleGameClock(clock);
    clock.turn = clock.turn === "w" ? "b" : "w";
    clock.running = true;
    clock.lastTickAtMs = Date.now();
    clock.turnStartedAtMs = clock.lastTickAtMs;
    return clock;
  }

  private buildClockSnapshot(clock: GameClockState): {
    whiteTimeMs: number;
    blackTimeMs: number;
    whiteTimeSeconds: number;
    blackTimeSeconds: number;
    turn: "w" | "b";
    serverTimeMs: number;
  } {
    return {
      whiteTimeMs: Math.max(0, Math.round(clock.whiteTimeMs)),
      blackTimeMs: Math.max(0, Math.round(clock.blackTimeMs)),
      whiteTimeSeconds: Math.max(0, Math.ceil(clock.whiteTimeMs / 1000)),
      blackTimeSeconds: Math.max(0, Math.ceil(clock.blackTimeMs / 1000)),
      turn: clock.turn,
      serverTimeMs: Date.now(),
    };
  }

  private emitGameClock(matchId: string, clock: GameClockState): void {
    this.server.to(`match:${matchId}`).emit("game:timeUpdate", {
      matchId,
      clocks: this.buildClockSnapshot(clock),
    });
  }

  private emitGameClockToSocket(socketId: string, clock: GameClockState): void {
    this.server.to(socketId).emit("game:timeUpdate", {
      matchId: clock.matchId,
      clocks: this.buildClockSnapshot(clock),
    });
  }

  private stopGameClock(matchId: string): void {
    const clock = this.gameClocks.get(matchId);
    if (clock) {
      clock.running = false;
      clock.ending = true;
    }
    this.gameClocks.delete(matchId);
    this.clearPendingDisconnectsForMatch(matchId);
  }

  private pendingDisconnectKey(matchId: string, userId: string): string {
    return `${matchId}:${userId}`;
  }

  private clearPendingDisconnectsForMatch(matchId: string): void {
    for (const [key, pending] of this.pendingDisconnectForfeits.entries()) {
      if (pending.matchId !== matchId) continue;
      clearTimeout(pending.timer);
      this.pendingDisconnectForfeits.delete(key);
    }
  }

  private clearPendingDisconnectsForUser(userId: string): void {
    for (const [key, pending] of this.pendingDisconnectForfeits.entries()) {
      if (pending.userId !== userId) continue;
      clearTimeout(pending.timer);
      this.pendingDisconnectForfeits.delete(key);
      this.server.to(`match:${pending.matchId}`).emit("game:opponentReconnected", {
        matchId: pending.matchId,
        userId,
        at: new Date().toISOString(),
      });
    }
  }

  private scheduleDisconnectForfeit(matchId: string, user: SocketUser): void {
    const key = this.pendingDisconnectKey(matchId, user.userId);
    if (this.pendingDisconnectForfeits.has(key)) return;

    this.server.to(`match:${matchId}`).emit("game:opponentDisconnected", {
      matchId,
      userId: user.userId,
      graceSeconds: Math.ceil(this.disconnectAutoLoseMs / 1000),
      at: new Date().toISOString(),
    });

    const timer = setTimeout(() => {
      this.pendingDisconnectForfeits.delete(key);
      if (this.socketsByUser.has(user.userId)) return;
      void this.completeGameByDisconnectForfeit(matchId, user);
    }, this.disconnectAutoLoseMs);

    this.pendingDisconnectForfeits.set(key, {
      matchId,
      userId: user.userId,
      timer,
    });
  }

  private async completeGameByDisconnectForfeit(
    matchId: string,
    user: SocketUser,
  ): Promise<void> {
    let didEmitGameEnd = false;
    try {
      const completion =
        await this.competitionService.completeRankedMatchByDisconnect(
          matchId,
          user.userId,
        );

      if (completion) {
        const payload: GameEndPayload = {
          matchId,
          reason: "disconnect_forfeit",
          result: completion.result,
          resignedByUserId: user.userId,
          at: completion.finishedAt,
        };
        this.emitGameEnd(
          matchId,
          {
            whitePlayerId: completion.whitePlayerId,
            blackPlayerId: completion.blackPlayerId,
          },
          payload,
        );
        this.stopGameClock(matchId);
        didEmitGameEnd = true;
      }
    } catch (error) {
      this.logger.warn(
        `Disconnect completion skipped for match=${matchId}: ${(error as Error).message}`,
      );
    }

    if (didEmitGameEnd) return;

    try {
      const roomCompletion =
        await this.competitionService.completeRoomGameByResignation(
          matchId,
          user.userId,
        );
      if (!roomCompletion) return;

      const participants =
        await this.competitionService.getMatchParticipants(matchId);
      const payload: GameEndPayload = {
        matchId,
        reason: "disconnect_forfeit",
        result: roomCompletion.result,
        resignedByUserId: user.userId,
        at: roomCompletion.finishedAt,
      };

      this.emitGameEnd(matchId, participants, payload);
      this.stopGameClock(matchId);
    } catch (error) {
      this.logger.warn(
        `Room disconnect completion skipped for match=${matchId}: ${(error as Error).message}`,
      );
    }
  }

  private async tickGameClocks(): Promise<void> {
    for (const [matchId, clock] of this.gameClocks.entries()) {
      this.settleGameClock(clock);
      this.emitGameClock(matchId, clock);

      if (
        !clock.ending &&
        (clock.whiteTimeMs <= 0 || clock.blackTimeMs <= 0)
      ) {
        clock.ending = true;
        await this.completeGameByTimeout(
          matchId,
          clock.whiteTimeMs <= 0 ? "w" : "b",
        );
        continue;
      }

      if (
        !clock.ending &&
        Date.now() - clock.turnStartedAtMs >= this.afkAutoLoseMs
      ) {
        clock.ending = true;
        await this.completeGameByTimeout(matchId, clock.turn, "afk");
      }
    }
  }

  private async completeGameByTimeout(
    matchId: string,
    timedOutSide: "w" | "b",
    reason: "timeout" | "afk" = "timeout",
  ): Promise<void> {
    const participants =
      await this.competitionService.getMatchParticipants(matchId);
    if (!participants) {
      this.stopGameClock(matchId);
      return;
    }

    const timedOutUserId =
      timedOutSide === "w"
        ? participants.whitePlayerId
        : participants.blackPlayerId;
    const winnerResult =
      timedOutSide === "w"
        ? RankedMatchCompletionResult.BLACK_WIN
        : RankedMatchCompletionResult.WHITE_WIN;

    const roomCompletion =
      await this.competitionService.completeRoomGameByTimeout(
        matchId,
        timedOutSide === "w" ? "white" : "black",
        reason,
      );
    if (roomCompletion) {
      const payload: GameEndPayload = {
        matchId,
        reason,
        result: roomCompletion.result,
        at: roomCompletion.finishedAt,
      };
      this.stopGameClock(matchId);
      this.emitGameEnd(matchId, participants, payload);
      return;
    }

    try {
      const completion = await this.competitionService.completeRankedMatch(
        { userId: timedOutUserId, roles: [] },
        matchId,
        { reason, result: winnerResult },
      );
      const payload: GameEndPayload = {
        matchId,
        reason,
        result: String(completion.result),
        at: new Date().toISOString(),
      };
      this.stopGameClock(matchId);
      this.emitGameEnd(matchId, participants, payload);
    } catch (error) {
      this.logger.warn(
        `Could not complete match ${matchId} by timeout: ${(error as Error).message}`,
      );
      this.stopGameClock(matchId);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = this.authenticateClient(client);
      client.data.user = user;

      const socketSet =
        this.socketsByUser.get(user.userId) || new Set<string>();
      socketSet.add(client.id);
      this.socketsByUser.set(user.userId, socketSet);
      this.clearPendingDisconnectsForUser(user.userId);

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
    if (socketSet.size === 0) {
      this.socketsByUser.delete(user.userId);
    }

    if (activeMatchId) {
      await this.completeGameByDisconnectForfeit(activeMatchId, user);
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

    const joinResult = await this.competitionService.joinQueue(
      { userId: user.userId, roles: user.roles || [] },
      payload,
    );

    const joinStatus = String(joinResult?.status || "").toLowerCase();
    if (joinStatus === "in_match") {
      client.emit("ranked:error", {
        code: "ALREADY_IN_MATCH",
        message: "Bạn đang trong một trận rank khác, không thể vào hàng chờ.",
        matchId: joinResult?.matchId || null,
      });
      return;
    }
    if (joinStatus === "matching") {
      client.emit("ranked:error", {
        code: "MATCHING_IN_PROGRESS",
        message:
          "Đang xử lý ghép trận hiện tại, vui lòng chờ vài giây rồi thử lại.",
      });
      return;
    }

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
    if (this.isMatchmakingCycleRunning) {
      return;
    }
    this.isMatchmakingCycleRunning = true;
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
    } finally {
      this.isMatchmakingCycleRunning = false;
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

    const allowed = await this.competitionService.canUserJoinMatchRoom(
      matchId,
      user.userId,
      user.roles || [],
    );
    if (!allowed) {
      throw new UnauthorizedException(
        "User is not allowed to join this match room",
      );
    }

    client.join(`match:${matchId}`);
    this.matchBySocketId.set(client.id, matchId);
    const clock = await this.ensureGameClock(matchId);
    this.emitGameClockToSocket(client.id, clock);
  }

  @SubscribeMessage("tournament:register")
  async onTournamentRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TournamentRegisterPayload | undefined,
  ): Promise<void> {
    this.getSocketUser(client);
    const tournamentId = String(body?.tournamentId || "").trim();
    if (!tournamentId) {
      throw new UnauthorizedException("Missing tournamentId");
    }
    client.join(this.tournamentRoom(tournamentId));
  }

  @SubscribeMessage("tournament:withdraw")
  async onTournamentWithdraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TournamentRegisterPayload | undefined,
  ): Promise<void> {
    this.getSocketUser(client);
    const tournamentId = String(body?.tournamentId || "").trim();
    if (!tournamentId) {
      throw new UnauthorizedException("Missing tournamentId");
    }
    client.leave(this.tournamentRoom(tournamentId));
  }

  @SubscribeMessage("room:register")
  async onRoomRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomJoinPayload | undefined,
  ): Promise<void> {
    this.getSocketUser(client);
    const roomCode = String(body?.code || "").trim().toUpperCase();
    if (!roomCode) {
      throw new UnauthorizedException("Missing room code");
    }
    client.join(this.roomChannel(roomCode));
  }

  @SubscribeMessage("room:withdraw")
  async onRoomWithdraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomJoinPayload | undefined,
  ): Promise<void> {
    this.getSocketUser(client);
    const roomCode = String(body?.code || "").trim().toUpperCase();
    if (!roomCode) {
      throw new UnauthorizedException("Missing room code");
    }
    client.leave(this.roomChannel(roomCode));
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
    client.join(`match:${matchId}`);

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

    const clock = await this.applyMoveToGameClock(matchId);
    const authoritativeMove = {
      ...move,
      clocks: this.buildClockSnapshot(clock),
    };

    this.server
      .to(`match:${matchId}`)
      .except(client.id)
      .emit("game:moveUpdate", {
        matchId,
        move: authoritativeMove,
        byUserId: user.userId,
        at: new Date().toISOString(),
      });
    this.emitGameClock(matchId, clock);
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
    client.join(`match:${matchId}`);

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
      this.stopGameClock(matchId);
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
      this.stopGameClock(matchId);
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
      this.stopGameClock(matchId);
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

    client.join(`match:${matchId}`);
    const participants =
      await this.competitionService.getMatchParticipants(matchId);
    this.emitGameDrawOffer(matchId, participants, client.id, {
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

    client.join(`match:${matchId}`);
    const participants =
      await this.competitionService.getMatchParticipants(matchId);

    this.emitGameDrawOffer(matchId, participants, null, {
      matchId,
      type: "accepted",
      byUserId: user.userId,
      at: new Date().toISOString(),
    });

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
      this.stopGameClock(matchId);
      this.emitGameEnd(matchId, participants, payload);
      return;
    } catch {
      const roomCompletion =
        await this.competitionService.completeRoomGameByDrawAgreement(matchId);
      if (roomCompletion) {
        const payload: GameEndPayload = {
          matchId,
          reason: "draw_agreement",
          result: roomCompletion.result,
          at: roomCompletion.finishedAt,
        };
        this.stopGameClock(matchId);
        this.emitGameEnd(matchId, participants, payload);
        return;
      }

      const payload: GameEndPayload = {
        matchId,
        reason: "draw_agreement",
        result: RankedMatchCompletionResult.DRAW,
        at: new Date().toISOString(),
      };
      this.stopGameClock(matchId);
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

    client.join(`match:${matchId}`);
    const participants =
      await this.competitionService.getMatchParticipants(matchId);
    this.emitGameDrawOffer(matchId, participants, null, {
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

  private emitGameDrawOffer(
    matchId: string,
    participants: { whitePlayerId: string; blackPlayerId: string } | null,
    exceptSocketId: string | null,
    payload: Record<string, unknown>,
  ): void {
    if (!participants) {
      const roomEmitter = this.server.to(`match:${matchId}`);
      if (exceptSocketId) {
        roomEmitter.except(exceptSocketId).emit("game:drawOffer", payload);
      } else {
        roomEmitter.emit("game:drawOffer", payload);
      }
      return;
    }

    const targetSocketIds = new Set<string>();
    for (const socketId of this.socketsByUser.get(participants.whitePlayerId) || []) {
      targetSocketIds.add(socketId);
    }
    for (const socketId of this.socketsByUser.get(participants.blackPlayerId) || []) {
      targetSocketIds.add(socketId);
    }
    if (exceptSocketId) {
      targetSocketIds.delete(exceptSocketId);
    }

    if (targetSocketIds.size === 0) {
      const roomEmitter = this.server.to(`match:${matchId}`);
      if (exceptSocketId) {
        roomEmitter.except(exceptSocketId).emit("game:drawOffer", payload);
      } else {
        roomEmitter.emit("game:drawOffer", payload);
      }
      return;
    }

    for (const socketId of targetSocketIds) {
      this.server.to(socketId).emit("game:drawOffer", payload);
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
