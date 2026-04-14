import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Chess } from "chess.js";
import { ObjectId } from "mongodb";
import { SocialBotRepository } from "./social-bot.repository";
import { BotMoveDto } from "./dto/bot-move.dto";
import { CreateBotGameDto } from "./dto/create-bot-game.dto";
import { CreateRoomDto } from "./dto/create-room.dto";
import {
  TournamentWinnerSlot,
  UpdateTournamentMatchResultDto,
} from "./dto/manage-tournament-result.dto";
import { SaveBotGameDto } from "./dto/save-bot-game.dto";
import { BotTacticalHintDto } from "./dto/bot-tactical-hint.dto";
import { GroqService } from "./groq.service";
import { StockfishService } from "./stockfish.service";
import { RankedGateway } from "../competition/ranked.gateway";

interface TournamentPrincipal {
  userId: string;
  roles: string[];
}

type ReplayAiCacheEntry = {
  aiCommentary: string;
  analysis: {
    fen: string;
    userMove: string;
    stockfishBestMove: string;
    score: number;
  };
  expiresAt: number;
};

@Injectable()
export class SocialBotService {
  private readonly aiFallbackMessage =
    "AI đang bận, vui lòng phân tích lại sau";
  private readonly tournamentNoShowTimeoutMs = 5 * 60 * 1000;
  private readonly tournamentMonitorTickMs = 30 * 1000;
  private readonly replayAiCache = new Map<string, ReplayAiCacheEntry>();
  private readonly replayAiCacheTtlMs = 10 * 60 * 1000;
  private readonly replayAiCacheMaxEntries = 1000;
  private readonly tournamentMonitorTimer: NodeJS.Timeout;

  constructor(
    private readonly repo: SocialBotRepository,
    private readonly stockfishService: StockfishService,
    private readonly groqService: GroqService,
    private readonly rankedGateway: RankedGateway,
  ) {
    this.tournamentMonitorTimer = setInterval(() => {
      void this.processTournamentNoShows();
    }, this.tournamentMonitorTickMs);
  }

  private makeReplayAiCacheKey(
    gameId: string,
    fen: string,
    userMove: string,
    playerColor: string = "white",
  ): string {
    return `${gameId}::${playerColor}::${fen}::${userMove}`;
  }

  private getReplayAiCache(
    key: string,
  ): { aiCommentary: string; analysis: ReplayAiCacheEntry["analysis"] } | null {
    const cached = this.replayAiCache.get(key);
    if (!cached) return null;

    if (cached.expiresAt < Date.now()) {
      this.replayAiCache.delete(key);
      return null;
    }

    return {
      aiCommentary: cached.aiCommentary,
      analysis: cached.analysis,
    };
  }

  private setReplayAiCache(
    key: string,
    payload: { aiCommentary: string; analysis: ReplayAiCacheEntry["analysis"] },
  ): void {
    this.replayAiCache.set(key, {
      ...payload,
      expiresAt: Date.now() + this.replayAiCacheTtlMs,
    });

    if (this.replayAiCache.size > this.replayAiCacheMaxEntries) {
      const oldestKey = this.replayAiCache.keys().next().value;
      if (oldestKey) {
        this.replayAiCache.delete(oldestKey);
      }
    }
  }

  private isLegalUciMove(fen: string, uci: string | undefined): boolean {
    if (!uci || uci.length < 4) {
      return false;
    }

    try {
      const chess = new Chess(fen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion =
        uci.length > 4 ? uci.slice(4, 5).toLowerCase() : undefined;
      const legalMoves = chess.moves({ verbose: true });

      return legalMoves.some(
        (mv) =>
          mv.from === from &&
          mv.to === to &&
          (promotion ? mv.promotion === promotion : true),
      );
    } catch {
      return false;
    }
  }

  private getFallbackLegalMove(
    fen: string,
  ): { bestMoveUci: string; evaluation: number | null } | null {
    try {
      const chess = new Chess(fen);
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) {
        return null;
      }

      const picked = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      const promotion = picked.promotion ? String(picked.promotion) : "";

      return {
        bestMoveUci: `${picked.from}${picked.to}${promotion}`,
        evaluation: null,
      };
    } catch {
      return null;
    }
  }

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

  private normalizeRoom(room: Record<string, unknown> | null) {
    if (!room) {
      return room;
    }

    const roomCode = (room.roomCode || room.code) as string | undefined;
    return {
      ...room,
      roomCode: roomCode || null,
      code: roomCode || null,
    };
  }

  private normalizeTournamentStatus(status: unknown): string {
    const value = typeof status === "string" ? status.toLowerCase() : "";
    if (value === "draft" || value === "open") return "registration";
    if (value === "ongoing") return "ongoing";
    if (value === "completed") return "completed";
    if (value === "cancelled") return "cancelled";
    return "registration";
  }

  private toTournamentFormatLabel(format: unknown): string {
    const value = typeof format === "string" ? format.toLowerCase() : "";
    if (value === "knockout") return "Single Elimination";
    if (value === "round_robin") return "Round Robin";
    if (value === "swiss") return "Swiss";
    return "Single Elimination";
  }

  private canManageTournament(
    principal: TournamentPrincipal,
    tournament: Record<string, unknown>,
  ): boolean {
    const roles = Array.isArray(principal.roles)
      ? principal.roles.filter(
          (role): role is string => typeof role === "string",
        )
      : [];
    const principalId = String(principal.userId || "");
    const ownerCandidates = [
      tournament.createdBy,
      tournament.organizerId,
      tournament.ownerUserId,
    ]
      .map((value) => {
        if (typeof value === "string") return value;
        if (
          value &&
          typeof value === "object" &&
          "toString" in value &&
          typeof (value as { toString?: unknown }).toString === "function"
        ) {
          return (value as { toString: () => string }).toString();
        }
        return "";
      })
      .filter((value) => value.length > 0);

    return (
      ownerCandidates.includes(principalId) ||
      roles.includes("admin") ||
      roles.includes("mod")
    );
  }

  private normalizeMatchStatus(status: unknown): string {
    const value = typeof status === "string" ? status.toLowerCase() : "";
    if (value === "completed") return "completed";
    if (value === "ongoing") return "ongoing";
    if (value === "scheduled") return "scheduled";
    return "pending";
  }

  private extractFenFromPgn(pgn: string): string | null {
    try {
      const chess = new Chess();
      if (typeof chess.loadPgn === "function") {
        chess.loadPgn(pgn);
        return chess.fen();
      }
    } catch {
      return null;
    }

    return null;
  }

  private cloneTournamentRounds(
    rounds: unknown,
  ): Array<Record<string, unknown>> {
    if (!Array.isArray(rounds)) return [];
    return rounds.map((round: any) => ({
      ...round,
      matches: Array.isArray(round?.matches)
        ? round.matches.map((match: any) => ({
            ...match,
            player1: match?.player1 ? { ...match.player1 } : null,
            player2: match?.player2 ? { ...match.player2 } : null,
          }))
        : [],
    }));
  }

  private resolveWinnerSlot(slot: unknown): TournamentWinnerSlot {
    if (slot === TournamentWinnerSlot.PLAYER1)
      return TournamentWinnerSlot.PLAYER1;
    if (slot === TournamentWinnerSlot.PLAYER2)
      return TournamentWinnerSlot.PLAYER2;
    throw new BadRequestException("Invalid winner slot");
  }

  private locateTournamentMatch(
    rounds: Array<Record<string, unknown>>,
    matchId: string,
  ): {
    roundIndex: number;
    matchIndex: number;
    match: any;
  } | null {
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      const round = rounds[roundIndex] as any;
      const matches = Array.isArray(round?.matches) ? round.matches : [];
      for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
        const match = matches[matchIndex] as any;
        if (String(match?.id || "") === matchId) {
          return { roundIndex, matchIndex, match };
        }
      }
    }

    return null;
  }

  private syncTournamentAdvancement(
    rounds: Array<Record<string, unknown>>,
    roundIndex: number,
    matchIndex: number,
    winnerName: string,
    winnerSeed: number | null,
    winnerUserId: string | null,
  ) {
    const currentRound = rounds[roundIndex] as any;
    const currentMatch = currentRound?.matches?.[matchIndex] as any;
    const nextRound = rounds[roundIndex + 1] as any;
    if (!currentMatch || !nextRound) {
      return;
    }

    const nextMatchId = String(currentMatch.nextMatchId || "");
    if (!nextMatchId) {
      return;
    }

    const nextMatch = (
      Array.isArray(nextRound.matches)
        ? nextRound.matches.find(
            (match: any) => String(match?.id || "") === nextMatchId,
          )
        : null
    ) as Record<string, unknown> | null;
    if (!nextMatch) {
      return;
    }

    const nextSlot =
      currentMatch.nextSlot === "player2" ? "player2" : "player1";
    const nextPlayer = {
      name: winnerName,
      seed: winnerSeed,
      userId: winnerUserId,
      score: null,
    };

    nextMatch[nextSlot] = nextPlayer;
    nextMatch.status = this.normalizeMatchStatus(nextMatch.status);
    if (nextMatch.status === "pending") {
      nextMatch.status = "scheduled";
    }
  }

  private refreshBracketRoundStatuses(rounds: Array<Record<string, unknown>>) {
    for (const round of rounds) {
      if (!Array.isArray(round?.matches)) continue;
      for (const match of round.matches as Array<any>) {
        const player1Name = String(match?.player1?.name || "");
        const player2Name = String(match?.player2?.name || "");
        if (
          match.status !== "completed" &&
          player1Name !== "TBD" &&
          player2Name !== "TBD"
        ) {
          match.status = "scheduled";
        }
      }
    }
  }

  private isTournamentRegistrationOpen(
    tournament: Record<string, unknown>,
  ): boolean {
    const status = this.normalizeTournamentStatus(tournament.status);
    if (status !== "registration") {
      return false;
    }

    const deadlineRaw =
      tournament.registrationDeadline ||
      tournament.startAt ||
      tournament.createdAt;
    const deadline = deadlineRaw ? new Date(String(deadlineRaw)) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) {
      return true;
    }

    return deadline.getTime() > Date.now();
  }

  private buildTournamentStandings(
    participants: Array<{
      userId: string;
      name: string;
      seed: number;
      rating: number;
    }>,
    rounds: Array<Record<string, unknown>>,
  ) {
    const table = new Map(
      participants.map((p) => [
        p.userId,
        {
          userId: p.userId,
          name: p.name,
          seed: p.seed,
          rating: p.rating,
          points: 0,
          wins: 0,
          losses: 0,
          played: 0,
          buchholz: 0,
        },
      ]),
    );

    for (const round of rounds) {
      const matches = Array.isArray((round as any)?.matches)
        ? ((round as any).matches as Array<any>)
        : [];

      for (const match of matches) {
        if (this.normalizeMatchStatus(match?.status) !== "completed") continue;

        const p1Id = String(match?.player1?.userId || "");
        const p2Id = String(match?.player2?.userId || "");
        if (!p1Id || !p2Id) continue;

        const p1 = table.get(p1Id);
        const p2 = table.get(p2Id);
        if (!p1 || !p2) continue;

        p1.played += 1;
        p2.played += 1;

        const result = String(match?.result || "");
        if (result === "1-0") {
          p1.points += 1;
          p1.wins += 1;
          p2.losses += 1;
        } else if (result === "0-1") {
          p2.points += 1;
          p2.wins += 1;
          p1.losses += 1;
        } else if (result === "draw" || result === "1/2-1/2") {
          p1.points += 0.5;
          p2.points += 0.5;
        }
      }
    }

    // Simple tie-break: sum of opponents' points from played matches.
    for (const round of rounds) {
      const matches = Array.isArray((round as any)?.matches)
        ? ((round as any).matches as Array<any>)
        : [];
      for (const match of matches) {
        if (this.normalizeMatchStatus(match?.status) !== "completed") continue;
        const p1Id = String(match?.player1?.userId || "");
        const p2Id = String(match?.player2?.userId || "");
        const p1 = table.get(p1Id);
        const p2 = table.get(p2Id);
        if (!p1 || !p2) continue;
        p1.buchholz += p2.points;
        p2.buchholz += p1.points;
      }
    }

    return [...table.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.seed - b.seed;
    });
  }

  private async attachTournamentGamesForRound(
    tournamentId: string,
    rounds: Array<Record<string, unknown>>,
    roundIndex: number,
  ) {
    const round = rounds[roundIndex] as any;
    if (!round || !Array.isArray(round.matches)) return;

    const now = new Date();
    for (const match of round.matches as Array<any>) {
      const status = this.normalizeMatchStatus(match?.status);
      const p1Id = String(match?.player1?.userId || "");
      const p2Id = String(match?.player2?.userId || "");

      if (status !== "scheduled") continue;
      if (!p1Id || !p2Id) continue;
      if (String(match?.gameId || "").length > 0) continue;

      const game = await this.repo.createGame({
        mode: "tournament",
        tournamentId,
        tournamentMatchId: String(match.id || ""),
        whitePlayerId: p1Id,
        blackPlayerId: p2Id,
        result: null,
        state: "InGame",
        status: "active",
        initialFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        noShowDeadlineAt: new Date(
          now.getTime() + this.tournamentNoShowTimeoutMs,
        ),
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
      });

      match.gameId = String(game._id);
    }
  }

  private async attachTournamentGamesForRounds(
    tournamentId: string,
    rounds: Array<Record<string, unknown>>,
    startRoundIndex: number,
  ) {
    for (
      let roundIndex = startRoundIndex;
      roundIndex < rounds.length;
      roundIndex += 1
    ) {
      await this.attachTournamentGamesForRound(
        tournamentId,
        rounds,
        roundIndex,
      );
    }
  }

  private async processTournamentNoShows(): Promise<void> {
    const tournaments = await this.repo.findTournamentsByStatus([
      "ongoing",
      "scheduled",
    ]);

    const now = Date.now();

    for (const tournament of tournaments as Array<any>) {
      const tournamentId = String(tournament?._id || "");
      if (!tournamentId) continue;

      const rounds = this.cloneTournamentRounds(tournament.rounds);
      let cancelledByNoShow = false;

      for (const round of rounds as Array<any>) {
        const matches = Array.isArray(round?.matches) ? round.matches : [];

        for (const match of matches as Array<any>) {
          const matchStatus = this.normalizeMatchStatus(match?.status);
          if (matchStatus !== "scheduled" && matchStatus !== "ongoing")
            continue;

          const gameId = String(match?.gameId || "");
          if (!gameId) continue;

          const game = await this.repo.findGameById(gameId);
          if (!game) continue;
          if (game.finishedAt || game.state === "Saved") continue;

          const deadlineRaw = game.noShowDeadlineAt || game.createdAt;
          const deadline = deadlineRaw ? new Date(deadlineRaw).getTime() : NaN;
          if (!Number.isFinite(deadline) || now < deadline) continue;

          const moves = Array.isArray(game.moves) ? game.moves : [];

          if (moves.length === 0) {
            await this.repo.updateGameById(gameId, {
              state: "Saved",
              status: "cancelled",
              result: "draw",
              finishedAt: new Date(),
              updatedAt: new Date(),
              endReason: "double_no_show",
            });

            await this.repo.updateTournamentById(tournamentId, {
              status: "cancelled",
              cancelledAt: new Date(),
              cancelReason: `Double no-show at match ${String(match?.id || "")}`,
              updatedAt: new Date(),
            });

            this.rankedGateway.emitTournamentRoundUpdate({
              tournamentId,
              status: "cancelled",
              rounds,
            });
            cancelledByNoShow = true;
            break;
          }

          if (moves.length === 1) {
            await this.repo.updateGameById(gameId, {
              state: "Saved",
              status: "finished",
              result: "white_win",
              finishedAt: new Date(),
              updatedAt: new Date(),
              endReason: "no_show_forfeit",
            });

            await this.updateTournamentMatchResult(
              {
                userId: String(tournament.createdBy || "system"),
                roles: ["admin"],
              },
              tournamentId,
              String(match.id || ""),
              { winnerSlot: TournamentWinnerSlot.PLAYER1, overwrite: true },
            );
          }
        }

        if (cancelledByNoShow) {
          break;
        }
      }
    }
  }

  private createTournamentRounds(
    participants: Array<{ userId: string; name: string; seed: number }>,
  ) {
    const nextPowerOfTwo =
      participants.length <= 1
        ? 2
        : Math.pow(2, Math.ceil(Math.log2(participants.length)));

    const bracketPlayers = [...participants];
    while (bracketPlayers.length < nextPowerOfTwo) {
      bracketPlayers.push({ userId: "", name: "TBD", seed: 0 });
    }

    const rounds: Array<Record<string, unknown>> = [];
    const firstRoundMatches: Array<Record<string, unknown>> = [];
    const firstRoundCount = nextPowerOfTwo / 2;

    for (let i = 0; i < firstRoundCount; i += 1) {
      const player1 = bracketPlayers[i];
      const player2 = bracketPlayers[nextPowerOfTwo - 1 - i];
      const player1Bye = player1.name === "TBD";
      const player2Bye = player2.name === "TBD";

      const winner =
        player1Bye && !player2Bye
          ? player2.name
          : player2Bye && !player1Bye
            ? player1.name
            : null;

      firstRoundMatches.push({
        id: `r1-m${i + 1}`,
        status: winner ? "completed" : "scheduled",
        winner,
        result: winner ? (winner === player1.name ? "1-0" : "0-1") : null,
        player1: {
          name: player1.name,
          seed: player1.seed || null,
          userId: player1.userId || null,
          score: winner === player1.name ? 1 : winner ? 0 : null,
        },
        player2: {
          name: player2.name,
          seed: player2.seed || null,
          userId: player2.userId || null,
          score: winner === player2.name ? 1 : winner ? 0 : null,
        },
      });
    }

    rounds.push({
      name: "Round 1",
      matches: firstRoundMatches,
    });

    let matchesInRound = firstRoundCount;
    let roundIndex = 2;
    while (matchesInRound > 1) {
      matchesInRound = Math.floor(matchesInRound / 2);
      const matches = Array.from({ length: matchesInRound }, (_, idx) => ({
        id: `r${roundIndex}-m${idx + 1}`,
        status: "pending",
        winner: null,
        result: null,
        player1: { name: "TBD", seed: null, userId: null, score: null },
        player2: { name: "TBD", seed: null, userId: null, score: null },
      }));

      rounds.push({
        name: matchesInRound === 1 ? "Final" : `Round ${roundIndex}`,
        matches,
      });
      roundIndex += 1;
    }

    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex += 1) {
      const currentRound = rounds[roundIndex];
      const nextRound = rounds[roundIndex + 1];
      if (
        !Array.isArray(currentRound?.matches) ||
        !Array.isArray(nextRound?.matches)
      ) {
        continue;
      }

      for (
        let matchIndex = 0;
        matchIndex < currentRound.matches.length;
        matchIndex += 1
      ) {
        const currentMatch = currentRound.matches[matchIndex] as Record<
          string,
          unknown
        >;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound.matches[nextMatchIndex] as
          | Record<string, unknown>
          | undefined;
        if (!nextMatch) continue;

        currentMatch.nextMatchId = nextMatch.id;
        currentMatch.nextSlot = matchIndex % 2 === 0 ? "player1" : "player2";
      }
    }

    return rounds;
  }

  async createRoom(userId: string, dto: CreateRoomDto) {
    const now = new Date();
    for (let attempt = 0; attempt < 5; attempt++) {
      const roomCode = this.makeRoomCode();
      try {
        const room = await this.repo.createRoom({
          roomCode,
          code: roomCode,
          ownerUserId: userId,
          name: dto.name ?? null,
          timeControl: dto.timeControl ?? "rapid",
          initialTimeSeconds: dto.initialTimeSeconds ?? 600,
          isPrivate: dto.isPrivate ?? true,
          status: "waiting",
          playerCount: 1,
          maxPlayers: 2,
          activeGameId: null,
          whitePlayerId: userId,
          blackPlayerId: null,
          createdAt: now,
          updatedAt: now,
        });

        await this.repo.addRoomMember({
          roomId: room._id,
          userId,
          role: "owner",
          joinedAt: now,
        });

        return this.normalizeRoom(room);
      } catch (error: any) {
        if (error?.code === 11000 && attempt < 4) {
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException("Could not generate a unique room code");
  }

  async joinRoom(userId: string, code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    if (room.status === "playing") {
      throw new BadRequestException("Room already started");
    }

    const members = await this.repo.findRoomMembers(room._id);
    const alreadyJoined = members.some((m: any) => m.userId === userId);
    if (alreadyJoined) {
      return room;
    }

    if (members.length >= 2) {
      throw new BadRequestException("Room is full");
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

  async startRoomGame(userId: string, code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    if (room.ownerUserId !== userId) {
      throw new BadRequestException("Only room owner can start the game");
    }

    if (room.activeGameId) {
      return {
        roomCode: code,
        gameId: String(room.activeGameId),
        status: room.status || "playing",
        whitePlayerId: room.whitePlayerId || room.ownerUserId,
        blackPlayerId: room.blackPlayerId || null,
      };
    }

    const members = await this.repo.findRoomMembers(room._id);
    const memberUserIds = Array.from(
      new Set([
        room.ownerUserId,
        ...members.map((member: any) => member.userId),
      ]),
    ).filter(
      (memberUserId): memberUserId is string =>
        typeof memberUserId === "string" && memberUserId.length > 0,
    );

    if (memberUserIds.length < 2) {
      throw new BadRequestException(
        "Need at least 2 players to start the game",
      );
    }

    const whitePlayerId = room.ownerUserId;
    const blackPlayerId = memberUserIds.find(
      (memberUserId) => memberUserId !== whitePlayerId,
    );
    if (!blackPlayerId) {
      throw new BadRequestException(
        "Could not determine opponent for room game",
      );
    }

    const now = new Date();
    const game = await this.repo.createGame({
      mode: "room",
      roomCode: code,
      roomId: room._id,
      whitePlayerId,
      blackPlayerId,
      result: null,
      state: "InGame",
      status: "active",
      initialFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
    });

    await this.repo.updateRoomByCode(code, {
      status: "playing",
      activeGameId: String(game._id),
      whitePlayerId,
      blackPlayerId,
      startedAt: now,
      updatedAt: now,
    });

    return {
      roomCode: code,
      code,
      gameId: String(game._id),
      status: "playing",
      whitePlayerId,
      blackPlayerId,
    };
  }

  async joinTournament(userId: string, tournamentId: string) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.isTournamentRegistrationOpen(tournament)) {
      throw new BadRequestException("Tournament is not open for registration");
    }

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;

    const existing = await this.repo.findTournamentParticipant(
      normalizedId,
      userId,
    );
    if (existing) {
      return { joined: true, tournamentId, alreadyJoined: true };
    }

    const currentParticipants =
      await this.repo.countTournamentParticipants(normalizedId);
    const maxParticipants = Number(tournament.maxParticipants || 0);
    if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
      throw new BadRequestException("Tournament is full");
    }

    const profileRows = await this.repo.findUserProfilesByIds([userId]);
    const profile = profileRows.find((row: any) => row._id === userId) as
      | { username?: string; rating?: number }
      | undefined;

    await this.repo.addTournamentParticipant({
      tournamentId: normalizedId,
      userId,
      username: profile?.username || null,
      rating: Number(profile?.rating || 1200),
      seed: currentParticipants + 1,
      joinedAt: new Date(),
      status: "pending",
    });

    this.rankedGateway.emitTournamentPlayerRegistered({
      tournamentId,
      userId,
      status: "pending",
    });

    await this.repo.updateTournamentById(tournamentId, {
      status:
        maxParticipants > 0 && currentParticipants + 1 >= maxParticipants
          ? "full"
          : "registration",
      updatedAt: new Date(),
    });

    return { joined: true, tournamentId };
  }

  async withdrawTournament(userId: string, tournamentId: string) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.isTournamentRegistrationOpen(tournament)) {
      throw new BadRequestException(
        "Cannot withdraw after registration closes",
      );
    }

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

    this.rankedGateway.emitTournamentPlayerWithdrawn({
      tournamentId,
      userId,
    });

    await this.repo.updateTournamentById(tournamentId, {
      status: "registration",
      updatedAt: new Date(),
    });
    return { withdrawn: true, tournamentId };
  }

  async startTournament(principal: TournamentPrincipal, tournamentId: string) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException("Only organizer or admin can start");
    }

    const normalizedStatus = this.normalizeTournamentStatus(tournament.status);
    if (normalizedStatus === "ongoing") {
      return {
        started: true,
        tournamentId,
        status: "ongoing",
        rounds: Array.isArray(tournament.rounds) ? tournament.rounds : [],
      };
    }

    if (normalizedStatus !== "registration") {
      throw new BadRequestException(
        "Tournament cannot be started in current state",
      );
    }

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participantsRaw =
      await this.repo.findTournamentParticipants(normalizedId);

    const participantIds = participantsRaw
      .filter((participant: any) => participant.status === "active")
      .map((participant: any) => String(participant.userId))
      .filter((value: string) => value.length > 0);
    const latestProfiles =
      await this.repo.findUserProfilesByIds(participantIds);
    const latestProfileMap = new Map(
      latestProfiles.map((profile: any) => [
        String(profile._id || profile.userId || ""),
        profile,
      ]),
    );

    const activeParticipants = participantsRaw
      .filter((participant: any) => participant.status !== "withdrawn")
      .filter((participant: any) => participant.status === "active")
      .map((participant: any, idx: number) => ({
        userId: String(participant.userId),
        name:
          typeof participant.username === "string" &&
          participant.username.length > 0
            ? participant.username
            : `Player ${idx + 1}`,
        rating: Number(
          latestProfileMap.get(String(participant.userId))?.rating ||
            participant.rating ||
            1200,
        ),
        seed: Number(participant.seed || idx + 1),
      }))
      .sort((a, b) => a.seed - b.seed);

    const pendingParticipants = participantsRaw.filter(
      (participant: any) => participant.status === "pending",
    );

    if (pendingParticipants.length > 0) {
      throw new BadRequestException(
        "Please approve or reject pending participants before starting",
      );
    }

    if (activeParticipants.length < 2) {
      throw new BadRequestException("Need at least 2 participants to start");
    }

    const rounds = this.createTournamentRounds(
      activeParticipants.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        seed: participant.seed,
      })),
    );

    this.refreshBracketRoundStatuses(rounds);
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      const round = rounds[roundIndex] as any;
      if (!Array.isArray(round?.matches)) continue;
      for (
        let matchIndex = 0;
        matchIndex < round.matches.length;
        matchIndex += 1
      ) {
        const match = round.matches[matchIndex] as any;
        if (match.status !== "completed" || !match.winner) continue;
        const winningPlayer =
          match.winner === match.player1?.name ? match.player1 : match.player2;
        this.syncTournamentAdvancement(
          rounds,
          roundIndex,
          matchIndex,
          String(match.winner),
          Number.isFinite(Number(winningPlayer?.seed))
            ? Number(winningPlayer?.seed)
            : null,
          String(winningPlayer?.userId || "") || null,
        );
      }
    }

    await this.attachTournamentGamesForRounds(tournamentId, rounds, 0);

    const standings = this.buildTournamentStandings(activeParticipants, rounds);

    const updated = await this.repo.updateTournamentById(tournamentId, {
      status: "ongoing",
      formatLabel: this.toTournamentFormatLabel(tournament.format),
      currentRound: 1,
      startedAt: new Date(),
      rounds,
      standings,
      updatedAt: new Date(),
    });

    if (updated) {
      this.rankedGateway.emitTournamentStarted({
        tournamentId,
        status: String(updated.status || "ongoing"),
        rounds,
      });
      this.rankedGateway.emitTournamentRoundUpdate({
        tournamentId,
        roundIndex: 0,
        status: String(updated.status || "ongoing"),
        rounds,
      });
      const firstRound = Array.isArray(rounds) ? (rounds[0] as any) : null;
      if (Array.isArray(firstRound?.matches)) {
        for (const match of firstRound.matches as Array<any>) {
          if (String(match?.gameId || "").length > 0) {
            this.rankedGateway.emitTournamentMatchReady({
              tournamentId,
              matchId: String(match.id || ""),
              gameId: String(match.gameId),
              roundIndex: 0,
            });
          }
        }
      }
    }

    return {
      started: true,
      tournamentId,
      status: "ongoing",
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
      standings,
    };
  }

  async cancelTournament(principal: TournamentPrincipal, tournamentId: string) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException("Only organizer or admin can cancel");
    }

    const updated = await this.repo.updateTournamentById(tournamentId, {
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      cancelled: true,
      tournamentId,
      status: updated?.status || "cancelled",
    };
  }

  async approveTournamentParticipant(
    principal: TournamentPrincipal,
    tournamentId: string,
    participantUserId: string,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException(
        "Only organizer or admin can approve participants",
      );
    }

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participant = await this.repo.findTournamentParticipant(
      normalizedId,
      participantUserId,
    );

    if (!participant) {
      throw new NotFoundException("Participant request not found");
    }

    if (participant.status === "active") {
      return {
        approved: true,
        tournamentId,
        participantUserId,
        alreadyApproved: true,
      };
    }

    if (participant.status !== "pending") {
      throw new BadRequestException("Participant request is not pending");
    }

    const currentParticipants =
      await this.repo.countTournamentParticipants(normalizedId);
    const maxParticipants = Number(tournament.maxParticipants || 0);

    await this.repo.updateTournamentParticipantStatus(
      normalizedId,
      participantUserId,
      "active",
    );

    await this.repo.updateTournamentById(tournamentId, {
      status:
        maxParticipants > 0 && currentParticipants >= maxParticipants
          ? "full"
          : "registration",
      updatedAt: new Date(),
    });

    this.rankedGateway.emitTournamentPlayerRegistered({
      tournamentId,
      userId: participantUserId,
      status: "active",
    });

    return {
      approved: true,
      tournamentId,
      participantUserId,
    };
  }

  async rejectTournamentParticipant(
    principal: TournamentPrincipal,
    tournamentId: string,
    participantUserId: string,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException(
        "Only organizer or admin can reject participants",
      );
    }

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participant = await this.repo.findTournamentParticipant(
      normalizedId,
      participantUserId,
    );

    if (!participant) {
      throw new NotFoundException("Participant request not found");
    }

    if (participant.status === "active") {
      throw new BadRequestException("Active participant cannot be rejected");
    }

    await this.repo.removeTournamentParticipant(
      normalizedId,
      participantUserId,
    );

    this.rankedGateway.emitTournamentPlayerWithdrawn({
      tournamentId,
      userId: participantUserId,
    });

    await this.repo.updateTournamentById(tournamentId, {
      status: "registration",
      updatedAt: new Date(),
    });

    return {
      rejected: true,
      tournamentId,
      participantUserId,
    };
  }

  async updateTournamentMatchResult(
    principal: TournamentPrincipal,
    tournamentId: string,
    matchId: string,
    dto: UpdateTournamentMatchResultDto,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException(
        "Only organizer or admin can manage results",
      );
    }

    const rounds = this.cloneTournamentRounds(tournament.rounds);
    const found = this.locateTournamentMatch(rounds, matchId);
    if (!found) {
      throw new NotFoundException("Match not found in tournament bracket");
    }

    const match = found.match;
    const alreadyCompleted =
      this.normalizeMatchStatus(match.status) === "completed";
    if (alreadyCompleted && !dto.overwrite) {
      throw new BadRequestException("Match already completed");
    }

    const winnerSlot = this.resolveWinnerSlot(dto.winnerSlot);
    const winnerPlayer: any =
      winnerSlot === TournamentWinnerSlot.PLAYER1
        ? match.player1
        : match.player2;

    if (!winnerPlayer || String(winnerPlayer.name || "") === "TBD") {
      throw new BadRequestException("Winner player is not set");
    }

    match.status = "completed";
    match.winner = winnerPlayer.name;
    match.result = winnerSlot === TournamentWinnerSlot.PLAYER1 ? "1-0" : "0-1";
    match.completedAt = new Date();
    if (match.player1) {
      (match.player1 as any).score =
        winnerSlot === TournamentWinnerSlot.PLAYER1 ? 1 : 0;
    }
    if (match.player2) {
      (match.player2 as any).score =
        winnerSlot === TournamentWinnerSlot.PLAYER2 ? 1 : 0;
    }

    this.syncTournamentAdvancement(
      rounds,
      found.roundIndex,
      found.matchIndex,
      winnerPlayer.name,
      Number.isFinite(Number(winnerPlayer.seed))
        ? Number(winnerPlayer.seed)
        : null,
      String(winnerPlayer?.userId || "") || null,
    );

    this.refreshBracketRoundStatuses(rounds);

    await this.attachTournamentGamesForRounds(
      tournamentId,
      rounds,
      found.roundIndex + 1,
    );

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participantsRaw =
      await this.repo.findTournamentParticipants(normalizedId);
    const participantIds = participantsRaw
      .filter((participant: any) => participant.status === "active")
      .map((participant: any) => String(participant.userId))
      .filter((value: string) => value.length > 0);
    const latestProfiles =
      await this.repo.findUserProfilesByIds(participantIds);
    const latestProfileMap = new Map(
      latestProfiles.map((profile: any) => [
        String(profile._id || profile.userId || ""),
        profile,
      ]),
    );
    const activeParticipants = participantsRaw
      .filter((participant: any) => participant.status === "active")
      .map((participant: any, idx: number) => ({
        userId: String(participant.userId),
        name:
          typeof participant.username === "string" &&
          participant.username.length > 0
            ? participant.username
            : `Player ${idx + 1}`,
        rating: Number(
          latestProfileMap.get(String(participant.userId))?.rating ||
            participant.rating ||
            1200,
        ),
        seed: Number(participant.seed || idx + 1),
      }));
    const standings = this.buildTournamentStandings(activeParticipants, rounds);

    const finalRound = rounds[rounds.length - 1];
    const finalMatch = Array.isArray(finalRound?.matches)
      ? (finalRound.matches[0] as Record<string, unknown> | undefined)
      : undefined;
    const tournamentCompleted =
      Boolean(finalMatch) &&
      this.normalizeMatchStatus(finalMatch?.status) === "completed";

    const updated = await this.repo.updateTournamentById(tournamentId, {
      rounds,
      currentRound: tournamentCompleted ? rounds.length : found.roundIndex + 1,
      status: tournamentCompleted ? "completed" : "ongoing",
      standings,
      winner: tournamentCompleted
        ? finalMatch?.winner || null
        : tournament.winner || null,
      completedAt: tournamentCompleted
        ? new Date()
        : tournament.completedAt || null,
      updatedAt: new Date(),
    });

    this.rankedGateway.emitTournamentRoundUpdate({
      tournamentId,
      roundIndex: found.roundIndex,
      status: tournamentCompleted ? "completed" : "ongoing",
      rounds,
    });

    if (tournamentCompleted) {
      this.rankedGateway.emitTournamentCompleted({
        tournamentId,
        winner: String(finalMatch?.winner || ""),
        status: "completed",
        rounds,
      });
    }

    const nextRound = rounds[found.roundIndex + 1] as any;
    if (Array.isArray(nextRound?.matches)) {
      for (const nextMatch of nextRound.matches as Array<any>) {
        if (String(nextMatch?.gameId || "").length > 0) {
          this.rankedGateway.emitTournamentMatchReady({
            tournamentId,
            matchId: String(nextMatch.id || ""),
            gameId: String(nextMatch.gameId),
            roundIndex: found.roundIndex + 1,
          });
        }
      }
    }

    return {
      tournamentId,
      matchId,
      result: match.result,
      winner: match.winner,
      status:
        updated?.status || (tournamentCompleted ? "completed" : "ongoing"),
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
      standings,
    };
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
    const move =
      stockfishMove && this.isLegalUciMove(dto.fen, stockfishMove.bestMoveUci)
        ? stockfishMove
        : this.getFallbackLegalMove(dto.fen);

    if (!move) {
      await this.repo.updateBotMoveRequestResponse(
        requestLog._id as ObjectId,
        {
          error: "No legal moves available for current position",
        },
        "done",
      );
      throw new BadRequestException(
        "No legal moves available for current position",
      );
    }

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

  async getBotTacticalHint(userId: string, dto: BotTacticalHintDto) {
    const pgn = String(dto.pgn || "").trim();
    if (!pgn) {
      throw new BadRequestException("PGN is required");
    }

    const detailLevel = dto.detailLevel === "quick" ? "quick" : "detailed";
    const fen = this.extractFenFromPgn(pgn);
    let stockfishBestMove = "N/A";

    if (fen) {
      const stockfishMove = await this.stockfishService.getBestMove(
        fen,
        "advanced",
      );
      stockfishBestMove = stockfishMove?.bestMoveUci || "N/A";
    }

    const hint = await this.groqService.getTacticalCoachHint(
      pgn,
      detailLevel,
      stockfishBestMove,
    );

    return {
      userId,
      hint,
      detailLevel,
      stockfishBestMove,
      source: "groq+stockfish",
    };
  }

  async getGameById(
    gameId: string,
    options?: {
      analyzeFen?: string;
      userMove?: string;
      score?: number;
      refreshAi?: boolean;
      playerColor?: string;
    },
  ) {
    const game = await this.repo.findGameById(gameId);
    if (!game) {
      throw new NotFoundException("Game not found");
    }

    const fen = options?.analyzeFen;
    const userMove = options?.userMove;
    const parsedScore = Number(options?.score ?? 0);
    const playerColor = options?.playerColor === "black" ? "black" : "white";

    if (!fen || !userMove) {
      return {
        ...game,
        aiCommentary: null,
      };
    }

    const cacheKey = this.makeReplayAiCacheKey(
      gameId,
      fen,
      userMove,
      playerColor,
    );
    const shouldBypassCache = options?.refreshAi === true;
    if (!shouldBypassCache) {
      const cached = this.getReplayAiCache(cacheKey);
      if (cached) {
        return {
          ...game,
          aiCommentary: cached.aiCommentary,
          analysis: cached.analysis,
        };
      }
    }

    let stockfishMove: {
      bestMoveUci?: string;
      evaluation?: number | null;
    } | null = null;
    try {
      stockfishMove = await this.stockfishService.getBestMove(fen, "expert");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[SocialBotService] replay stockfish analyze failed: ${reason}`,
      );
    }

    const stockfishBestMove = stockfishMove?.bestMoveUci || "N/A";
    const score =
      Number.isFinite(parsedScore) && parsedScore !== 0
        ? parsedScore
        : Number(stockfishMove?.evaluation ?? 0);

    const aiCommentary = await this.groqService.analyzeMoveWithAI(
      fen,
      userMove,
      stockfishBestMove,
      score,
      playerColor,
    );

    const analysis = {
      fen,
      userMove,
      stockfishBestMove,
      score,
    };

    if (aiCommentary !== this.aiFallbackMessage) {
      this.setReplayAiCache(cacheKey, {
        aiCommentary,
        analysis,
      });
    }

    return {
      ...game,
      aiCommentary,
      analysis,
    };
  }

  async saveGame(userId: string, gameId: string, payload: SaveBotGameDto) {
    const game = await this.repo.findGameById(gameId);
    if (!game) {
      throw new NotFoundException("Game not found");
    }

    if (game.state === "Saved") {
      return {
        gameId,
        state: "Saved",
        result: game.rawResult || payload.result,
        storedResult: game.result || null,
        finishedAt: game.finishedAt
          ? new Date(game.finishedAt).toISOString()
          : new Date().toISOString(),
        game,
      };
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

    const whiteOutcome: "win" | "lose" | "draw" =
      payload.result === "Draw"
        ? "draw"
        : payload.result === "WhiteWin"
          ? "win"
          : "lose";
    const blackOutcome: "win" | "lose" | "draw" =
      payload.result === "Draw"
        ? "draw"
        : payload.result === "BlackWin"
          ? "win"
          : "lose";

    const now = new Date();
    const modeRaw = (payload.mode || game.mode || "bot") as string;
    const normalizedMode =
      modeRaw === "HumanVsBot" || modeRaw === "bot"
        ? "bot"
        : modeRaw === "HumanVsHuman" || modeRaw === "room"
          ? "room"
          : modeRaw === "ranked"
            ? "ranked"
            : "bot";

    const moves = Array.isArray(payload.moves)
      ? payload.moves
      : Array.isArray(game.moves)
        ? game.moves
        : [];

    const updatedGame = await this.repo.updateGameIfNotSaved(gameId, {
      result: normalizedResult,
      rawResult: payload.result,
      state: "Saved",
      mode: normalizedMode,
      moves,
      initialFEN: payload.initialFEN || null,
      whitePlayer: payload.whitePlayer || null,
      blackPlayer: payload.blackPlayer || null,
      metadata: {
        ...(payload.metadata || {}),
        totalMoves: moves.length,
      },
      finishedAt: now,
      updatedAt: now,
    });

    if (!updatedGame) {
      const latest = await this.repo.findGameById(gameId);
      return {
        gameId,
        state: latest?.state || "Saved",
        result: latest?.rawResult || payload.result,
        storedResult: latest?.result || null,
        finishedAt: latest?.finishedAt
          ? new Date(latest.finishedAt).toISOString()
          : now.toISOString(),
        game: latest,
      };
    }

    if (
      typeof game.whitePlayerId === "string" &&
      game.whitePlayerId !== "bot"
    ) {
      await this.repo.updateUserStatsByOutcome(
        game.whitePlayerId,
        whiteOutcome,
        now,
      );
    }
    if (
      typeof game.blackPlayerId === "string" &&
      game.blackPlayerId !== "bot"
    ) {
      await this.repo.updateUserStatsByOutcome(
        game.blackPlayerId,
        blackOutcome,
        now,
      );
    }

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
