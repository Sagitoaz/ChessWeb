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
import { TournamentSeedingDto } from "./dto/tournament-seeding.dto";
import { TournamentOpenRoundDto } from "./dto/tournament-open-round.dto";
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
    difficulty: string = "normal",
  ): { bestMoveUci: string; evaluation: number | null } | null {
    try {
      const chess = new Chess(fen);
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) {
        return null;
      }
      const normalizedDifficulty = (() => {
        const value = String(difficulty || "").trim().toLowerCase();
        if (value === "easy" || value === "beginner") return "easy";
        if (value === "hard" || value === "advanced") return "hard";
        if (
          value === "super_hard" ||
          value === "superhard" ||
          value === "expert"
        ) {
          return "super_hard";
        }
        return "normal";
      })();

      if (normalizedDifficulty === "easy") {
        const picked = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const promotion = picked.promotion ? String(picked.promotion) : "";
        return {
          bestMoveUci: `${picked.from}${picked.to}${promotion}`,
          evaluation: null,
        };
      }

      const evaluateBoard = (position: Chess, maximizingColor: "w" | "b") => {
        if (position.isCheckmate()) {
          return position.turn() === maximizingColor ? -100000 : 100000;
        }
        if (
          position.isDraw() ||
          position.isStalemate() ||
          position.isThreefoldRepetition() ||
          position.isInsufficientMaterial()
        ) {
          return 0;
        }

        const values: Record<string, number> = {
          p: 100,
          n: 320,
          b: 330,
          r: 500,
          q: 900,
          k: 0,
        };
        const board = position.board();
        let score = 0;
        for (const row of board) {
          for (const piece of row) {
            if (!piece) continue;
            const value = values[piece.type] || 0;
            score += piece.color === maximizingColor ? value : -value;
          }
        }
        const mobility =
          position.moves().length *
          (position.turn() === maximizingColor ? 1 : -1);
        return score + mobility * 2;
      };

      const minimax = (
        position: Chess,
        depth: number,
        alpha: number,
        beta: number,
        maximizingPlayer: boolean,
        maximizingColor: "w" | "b",
      ): number => {
        if (depth <= 0 || position.isGameOver()) {
          return evaluateBoard(position, maximizingColor);
        }

        const moves = position.moves({ verbose: true });
        if (moves.length === 0) {
          return evaluateBoard(position, maximizingColor);
        }

        if (maximizingPlayer) {
          let bestScore = -Infinity;
          for (const mv of moves) {
            position.move(mv);
            const score = minimax(
              position,
              depth - 1,
              alpha,
              beta,
              false,
              maximizingColor,
            );
            position.undo();
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
          }
          return bestScore;
        }

        let bestScore = Infinity;
        for (const mv of moves) {
          position.move(mv);
          const score = minimax(
            position,
            depth - 1,
            alpha,
            beta,
            true,
            maximizingColor,
          );
          position.undo();
          bestScore = Math.min(bestScore, score);
          beta = Math.min(beta, score);
          if (beta <= alpha) break;
        }
        return bestScore;
      };

      const depth =
        normalizedDifficulty === "super_hard"
          ? 3
          : normalizedDifficulty === "hard"
            ? 2
            : 2;

      const sideToMove = chess.turn();
      let bestMove = legalMoves[0];
      let bestScore = -Infinity;

      for (const mv of legalMoves) {
        chess.move(mv);
        const score = minimax(
          chess,
          depth - 1,
          -Infinity,
          Infinity,
          false,
          sideToMove,
        );
        chess.undo();

        if (score > bestScore) {
          bestScore = score;
          bestMove = mv;
        }
      }

      const promotion = bestMove.promotion ? String(bestMove.promotion) : "";
      return {
        bestMoveUci: `${bestMove.from}${bestMove.to}${promotion}`,
        evaluation: Math.round(bestScore / 100),
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
    if (value === "draft" || value === "open" || value === "full") {
      return "registration";
    }
    if (value === "ongoing") return "ongoing";
    if (value === "completed") return "completed";
    if (value === "cancelled") return "cancelled";
    return "registration";
  }

  private normalizeReplayPlayer(
    game: Record<string, unknown>,
    color: "white" | "black",
    profilesById: Map<
      string,
      {
        username?: string;
        displayName?: string;
        rating?: number;
        avatarUrl?: string;
      }
    >,
  ) {
    const playerKey = color === "white" ? "whitePlayer" : "blackPlayer";
    const playerIdKey = color === "white" ? "whitePlayerId" : "blackPlayerId";
    const existingPlayer =
      game[playerKey] && typeof game[playerKey] === "object"
        ? (game[playerKey] as Record<string, unknown>)
        : null;
    const playerId =
      typeof game[playerIdKey] === "string" ? String(game[playerIdKey]) : null;
    const isBot =
      Boolean(existingPlayer?.isBot) || playerId === "bot";
    const profile =
      playerId && playerId !== "bot" ? profilesById.get(playerId) : undefined;

    const username =
      String(
        existingPlayer?.displayName ||
        existingPlayer?.username ||
          profile?.displayName ||
          profile?.username ||
          (isBot ? "Bot" : color === "white" ? "Trắng" : "Đen"),
      ).trim() || (isBot ? "Bot" : color === "white" ? "Trắng" : "Đen");

    const rating =
      typeof existingPlayer?.rating === "number"
        ? Number(existingPlayer.rating)
        : typeof profile?.rating === "number"
          ? Number(profile.rating)
          : undefined;

    const avatarUrl =
      typeof existingPlayer?.avatarUrl === "string" && existingPlayer.avatarUrl.trim().length > 0
        ? existingPlayer.avatarUrl
        : typeof profile?.avatarUrl === "string" && profile.avatarUrl.trim().length > 0
          ? profile.avatarUrl
          : null;

    return {
      ...(existingPlayer || {}),
      username,
      displayName: username,
      rating,
      avatarUrl,
      isBot,
    };
  }

  private async enrichReplayGamePlayers(game: Record<string, unknown>) {
    const playerIds = [
      typeof game.whitePlayerId === "string" && game.whitePlayerId !== "bot"
        ? game.whitePlayerId
        : null,
      typeof game.blackPlayerId === "string" && game.blackPlayerId !== "bot"
        ? game.blackPlayerId
        : null,
    ].filter((value): value is string => Boolean(value));

    const profiles =
      playerIds.length > 0 ? await this.repo.findUserProfilesByIds(playerIds) : [];
    const profilesById = new Map(
      profiles.map((profile) => [
        String(profile._id),
        {
          username: profile.username,
          displayName: profile.displayName,
          rating: profile.rating,
          avatarUrl: profile.avatarUrl,
        },
      ]),
    );

    return {
      ...game,
      whitePlayer: this.normalizeReplayPlayer(game, "white", profilesById),
      blackPlayer: this.normalizeReplayPlayer(game, "black", profilesById),
    };
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
      (tournament.organizer as Record<string, unknown> | undefined)?.userId,
      (tournament.organizer as Record<string, unknown> | undefined)?._id,
      (tournament.organizer as Record<string, unknown> | undefined)?.id,
    ]
      .map((value) => {
        if (typeof value === "string") {
          const match = value.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
          return match?.[1] || value;
        }
        if (
          value &&
          typeof value === "object" &&
          "toString" in value &&
          typeof (value as { toString?: unknown }).toString === "function"
        ) {
          const asString = (value as { toString: () => string }).toString();
          const match = asString.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
          return match?.[1] || asString;
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
    if (value === "ready") return "ready";
    if (value === "scheduled") return "scheduled";
    return "pending";
  }

  private determineTournamentCurrentRound(
    rounds: Array<Record<string, unknown>>,
  ): number {
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      const round = rounds[roundIndex] as any;
      const matches = Array.isArray(round?.matches) ? round.matches : [];
      const hasPendingMatch = matches.some(
        (match: any) =>
          this.normalizeMatchStatus(match?.status) !== "completed",
      );
      if (hasPendingMatch) {
        return roundIndex + 1;
      }
    }

    return Math.max(1, rounds.length);
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

  private locateTournamentMatchByGameId(
    rounds: Array<Record<string, unknown>>,
    gameId: string,
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
        if (String(match?.gameId || "") === gameId) {
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

  private propagateBracketAutoAdvancement(
    rounds: Array<Record<string, unknown>>,
  ) {
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      const round = rounds[roundIndex] as any;
      if (!Array.isArray(round?.matches)) continue;

      for (
        let matchIndex = 0;
        matchIndex < round.matches.length;
        matchIndex += 1
      ) {
        const match = round.matches[matchIndex] as any;
        const p1Name = String(match?.player1?.name || "");
        const p2Name = String(match?.player2?.name || "");
        const normalizedStatus = this.normalizeMatchStatus(match?.status);

        if (normalizedStatus !== "completed") {
          if (p1Name !== "TBD" && p2Name === "TBD") {
            match.status = "completed";
            match.winner = p1Name;
            match.result = "1-0";
            if (match.player1) match.player1.score = 1;
            if (match.player2) match.player2.score = 0;
          } else if (p2Name !== "TBD" && p1Name === "TBD") {
            match.status = "completed";
            match.winner = p2Name;
            match.result = "0-1";
            if (match.player1) match.player1.score = 0;
            if (match.player2) match.player2.score = 1;
          }
        }

        if (
          this.normalizeMatchStatus(match?.status) === "completed" &&
          String(match?.winner || "").length > 0
        ) {
          this.syncTournamentAdvancement(
            rounds,
            roundIndex,
            matchIndex,
            String(match.winner),
            Number.isFinite(
              Number(
                match?.winner === p1Name
                  ? match?.player1?.seed
                  : match?.player2?.seed,
              ),
            )
              ? Number(
                  match?.winner === p1Name
                    ? match?.player1?.seed
                    : match?.player2?.seed,
                )
              : null,
            String(
              match?.winner === p1Name
                ? match?.player1?.userId || ""
                : match?.player2?.userId || "",
            ) || null,
          );
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
        } else if (result === "double_forfeit") {
          p1.losses += 1;
          p2.losses += 1;
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

  private resolveTournamentParticipantName(
    participant: Record<string, unknown>,
    profile:
      | {
          displayName?: string;
          username?: string;
        }
      | null
      | undefined,
    fallbackLabel: string,
  ): string {
    const preferred =
      (typeof profile?.displayName === "string" &&
      profile.displayName.trim().length > 0
        ? profile.displayName
        : typeof profile?.username === "string" &&
            profile.username.trim().length > 0
          ? profile.username
          : typeof participant?.username === "string" &&
              participant.username.trim().length > 0
            ? participant.username
            : null) || null;

    return preferred || fallbackLabel;
  }

  private buildTournamentParticipantSnapshots(
    participantsRaw: Array<Record<string, unknown>>,
    latestProfileMap: Map<string, any>,
    options?: {
      includeStatuses?: string[];
      excludeStatuses?: string[];
    },
  ) {
    const includeStatuses = Array.isArray(options?.includeStatuses)
      ? new Set(options?.includeStatuses)
      : null;
    const excludeStatuses = new Set(options?.excludeStatuses || []);

    return participantsRaw
      .filter((participant: any) => {
        const status = String(participant?.status || "");
        if (includeStatuses && !includeStatuses.has(status)) {
          return false;
        }
        if (excludeStatuses.has(status)) {
          return false;
        }
        return true;
      })
      .map((participant: any, idx: number) => {
        const userId = String(participant.userId || "");
        const profile = latestProfileMap.get(userId);
        return {
          userId,
          name: this.resolveTournamentParticipantName(
            participant,
            profile,
            `Player ${idx + 1}`,
          ),
          rating: Number(profile?.rating || participant.rating || 1200),
          seed: Number(participant.seed || idx + 1),
          status: String(participant.status || "active"),
        };
      })
      .filter((participant) => participant.userId.length > 0)
      .sort((a, b) => a.seed - b.seed);
  }

  private async attachTournamentGamesForRound(
    tournamentId: string,
    rounds: Array<Record<string, unknown>>,
    roundIndex: number,
    options?: { activateImmediately?: boolean; checkInMinutes?: number },
  ) {
    const round = rounds[roundIndex] as any;
    if (!round || !Array.isArray(round.matches)) return;

    const now = new Date();
    const activateImmediately = options?.activateImmediately === true;
    const checkInMinutes = Number(options?.checkInMinutes || 3);
    const checkInDeadlineAt = new Date(
      now.getTime() + Math.max(2, checkInMinutes) * 60 * 1000,
    );

    for (const match of round.matches as Array<any>) {
      const status = this.normalizeMatchStatus(match?.status);
      const p1Id = String(match?.player1?.userId || "");
      const p2Id = String(match?.player2?.userId || "");

      if (status !== "scheduled") continue;
      if (!p1Id || !p2Id) continue;
      if (String(match?.gameId || "").length > 0) {
        if (!activateImmediately) {
          match.status = "scheduled";
          match.checkIn = {
            player1Ready: Boolean(match?.checkIn?.player1Ready),
            player2Ready: Boolean(match?.checkIn?.player2Ready),
            openedAt: now,
            deadlineAt: checkInDeadlineAt,
          };
        }
        continue;
      }

      const game = await this.repo.createGame({
        mode: "tournament",
        tournamentId,
        tournamentMatchId: String(match.id || ""),
        whitePlayerId: p1Id,
        blackPlayerId: p2Id,
        result: null,
        state: activateImmediately ? "InGame" : "WaitingCheckIn",
        status: activateImmediately ? "active" : "pending",
        initialFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        checkInDeadlineAt,
        noShowDeadlineAt: activateImmediately
          ? new Date(now.getTime() + this.tournamentNoShowTimeoutMs)
          : null,
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
      });

      match.gameId = String(game._id);
      if (!activateImmediately) {
        match.status = "scheduled";
        match.checkIn = {
          player1Ready: false,
          player2Ready: false,
          openedAt: now,
          deadlineAt: checkInDeadlineAt,
        };
      } else {
        match.status = "ongoing";
      }
    }
  }

  private async attachTournamentGamesForRounds(
    tournamentId: string,
    rounds: Array<Record<string, unknown>>,
    startRoundIndex: number,
    options?: { activateImmediately?: boolean; checkInMinutes?: number },
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
        options,
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
      let roundsUpdated = false;

      for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
        const round = rounds[roundIndex] as any;
        const matches = Array.isArray(round?.matches) ? round.matches : [];

        for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
          const match = matches[matchIndex] as any;
          const matchStatus = this.normalizeMatchStatus(match?.status);
          if (
            matchStatus !== "scheduled" &&
            matchStatus !== "ongoing" &&
            matchStatus !== "ready"
          )
            continue;

          const gameId = String(match?.gameId || "");
          if (!gameId) continue;

          const game = await this.repo.findGameById(gameId);
          if (!game) continue;
          if (game.finishedAt || game.state === "Saved") continue;

          const checkIn =
            match?.checkIn && typeof match.checkIn === "object"
              ? match.checkIn
              : {};
          const p1Ready = Boolean((checkIn as any).player1Ready);
          const p2Ready = Boolean((checkIn as any).player2Ready);

          const deadlineRaw =
            (checkIn as any).deadlineAt ||
            game.checkInDeadlineAt ||
            game.noShowDeadlineAt ||
            game.createdAt;
          const deadline = deadlineRaw ? new Date(deadlineRaw).getTime() : NaN;
          if (!Number.isFinite(deadline) || now < deadline) continue;

          if (!p1Ready && !p2Ready) {
            await this.repo.updateGameById(gameId, {
              state: "Saved",
              status: "cancelled",
              result: "double_forfeit",
              finishedAt: new Date(),
              updatedAt: new Date(),
              endReason: "double_no_show",
            });

            match.status = "completed";
            match.winner = null;
            match.result = "double_forfeit";
            match.completedAt = new Date();
            if (match.player1) match.player1.score = 0;
            if (match.player2) match.player2.score = 0;
            roundsUpdated = true;
            continue;
          }

          if (p1Ready !== p2Ready) {
            const winnerSlot = p1Ready
              ? TournamentWinnerSlot.PLAYER1
              : TournamentWinnerSlot.PLAYER2;
            const winnerPlayer: any =
              winnerSlot === TournamentWinnerSlot.PLAYER1
                ? match.player1
                : match.player2;

            await this.repo.updateGameById(gameId, {
              state: "Saved",
              status: "finished",
              result:
                winnerSlot === TournamentWinnerSlot.PLAYER1
                  ? "white_win"
                  : "black_win",
              rawResult:
                winnerSlot === TournamentWinnerSlot.PLAYER1 ? "1-0" : "0-1",
              finishedAt: new Date(),
              updatedAt: new Date(),
              endReason: "no_show_forfeit",
            });

            match.status = "completed";
            match.winner = winnerPlayer?.name || null;
            match.result =
              winnerSlot === TournamentWinnerSlot.PLAYER1 ? "1-0" : "0-1";
            match.completedAt = new Date();
            if (match.player1) {
              match.player1.score =
                winnerSlot === TournamentWinnerSlot.PLAYER1 ? 1 : 0;
            }
            if (match.player2) {
              match.player2.score =
                winnerSlot === TournamentWinnerSlot.PLAYER2 ? 1 : 0;
            }

            this.syncTournamentAdvancement(
              rounds,
              roundIndex,
              matchIndex,
              String(winnerPlayer?.name || ""),
              Number.isFinite(Number(winnerPlayer?.seed))
                ? Number(winnerPlayer?.seed)
                : null,
              String(winnerPlayer?.userId || "") || null,
            );
            roundsUpdated = true;
          }
        }
      }

      if (roundsUpdated) {
        this.refreshBracketRoundStatuses(rounds);
        this.propagateBracketAutoAdvancement(rounds);

        const allCompleted = rounds.every((round: any) => {
          const matches = Array.isArray(round?.matches) ? round.matches : [];
          return matches.every(
            (match: any) =>
              this.normalizeMatchStatus(match?.status) === "completed",
          );
        });

        const finalRound = rounds[rounds.length - 1] as any;
        const finalMatch = Array.isArray(finalRound?.matches)
          ? (finalRound.matches[0] as any)
          : null;
        const winnerName = String(finalMatch?.winner || "") || null;

        await this.repo.updateTournamentById(tournamentId, {
          rounds,
          status: allCompleted ? "completed" : "ongoing",
          winner: winnerName,
          completedAt: allCompleted ? new Date() : null,
          updatedAt: new Date(),
        });

        this.rankedGateway.emitTournamentRoundUpdate({
          tournamentId,
          status: allCompleted ? "completed" : "ongoing",
          rounds,
        });

        if (allCompleted) {
          this.rankedGateway.emitTournamentCompleted({
            tournamentId,
            winner: winnerName || "",
            status: "completed",
            rounds,
          });
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

  private createEliminationRoundsFromFirstRound(
    firstRoundMatches: Array<Record<string, unknown>>,
  ) {
    const rounds: Array<Record<string, unknown>> = [
      {
        name: "Round 1",
        matches: firstRoundMatches,
      },
    ];

    let matchesInRound = firstRoundMatches.length;
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

    for (let idx = 0; idx < rounds.length - 1; idx += 1) {
      const currentRound = rounds[idx] as any;
      const nextRound = rounds[idx + 1] as any;
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
        const currentMatch = currentRound.matches[matchIndex] as any;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound.matches[nextMatchIndex] as any;
        if (!nextMatch) continue;

        currentMatch.nextMatchId = nextMatch.id;
        currentMatch.nextSlot = matchIndex % 2 === 0 ? "player1" : "player2";
      }
    }

    return rounds;
  }

  private createTournamentRoundsFromManualPairs(
    participants: Array<{ userId: string; name: string; seed: number }>,
    pairs: Array<{ player1UserId: string; player2UserId?: string }>,
  ) {
    const nextPowerOfTwo =
      participants.length <= 1
        ? 2
        : Math.pow(2, Math.ceil(Math.log2(participants.length)));
    const firstRoundCount = nextPowerOfTwo / 2;

    const participantById = new Map(
      participants.map((participant) => [participant.userId, participant]),
    );

    const usedUserIds = new Set<string>();
    const firstRoundMatches: Array<Record<string, unknown>> = [];

    for (let i = 0; i < firstRoundCount; i += 1) {
      const pair = pairs[i] || null;
      const p1Id = String(pair?.player1UserId || "");
      const p2Id = String(pair?.player2UserId || "");

      const p1 = participantById.get(p1Id) || {
        userId: "",
        name: "TBD",
        seed: 0,
      };
      const p2 = p2Id
        ? participantById.get(p2Id) || { userId: "", name: "TBD", seed: 0 }
        : { userId: "", name: "TBD", seed: 0 };

      if (p1.userId) usedUserIds.add(p1.userId);
      if (p2.userId) usedUserIds.add(p2.userId);

      const p1Bye = p1.name === "TBD";
      const p2Bye = p2.name === "TBD";
      const winner =
        p1Bye && !p2Bye ? p2.name : p2Bye && !p1Bye ? p1.name : null;

      firstRoundMatches.push({
        id: `r1-m${i + 1}`,
        status: winner ? "completed" : "scheduled",
        winner,
        result: winner ? (winner === p1.name ? "1-0" : "0-1") : null,
        player1: {
          name: p1.name,
          seed: p1.seed || null,
          userId: p1.userId || null,
          score: winner === p1.name ? 1 : winner ? 0 : null,
        },
        player2: {
          name: p2.name,
          seed: p2.seed || null,
          userId: p2.userId || null,
          score: winner === p2.name ? 1 : winner ? 0 : null,
        },
      });
    }

    const leftovers = participants.filter(
      (participant) => !usedUserIds.has(participant.userId),
    );
    if (leftovers.length > 0) {
      for (const match of firstRoundMatches as Array<any>) {
        if (leftovers.length === 0) break;
        if (!match?.player1?.userId || match.player1.name === "TBD") {
          const next = leftovers.shift()!;
          match.player1 = {
            name: next.name,
            seed: next.seed,
            userId: next.userId,
            score: null,
          };
        }
        if (leftovers.length === 0) break;
        if (!match?.player2?.userId || match.player2.name === "TBD") {
          const next = leftovers.shift()!;
          match.player2 = {
            name: next.name,
            seed: next.seed,
            userId: next.userId,
            score: null,
          };
        }
      }
    }

    for (const match of firstRoundMatches as Array<any>) {
      const p1Name = String(match?.player1?.name || "TBD");
      const p2Name = String(match?.player2?.name || "TBD");
      const p1Bye = p1Name === "TBD";
      const p2Bye = p2Name === "TBD";
      if (p1Bye && !p2Bye) {
        match.status = "completed";
        match.winner = p2Name;
        match.result = "0-1";
      } else if (p2Bye && !p1Bye) {
        match.status = "completed";
        match.winner = p1Name;
        match.result = "1-0";
      }
    }

    return this.createEliminationRoundsFromFirstRound(firstRoundMatches);
  }

  private resolveTargetRoundIndex(
    rounds: Array<Record<string, unknown>>,
    inputRoundIndex?: number,
  ): number {
    if (
      typeof inputRoundIndex === "number" &&
      Number.isFinite(inputRoundIndex)
    ) {
      const normalized = Math.max(1, Math.floor(inputRoundIndex));
      if (normalized > rounds.length) {
        throw new BadRequestException("Round index is out of range");
      }
      return normalized - 1;
    }

    const firstPendingIndex = rounds.findIndex((round: any) => {
      const matches = Array.isArray(round?.matches) ? round.matches : [];
      return matches.some(
        (match: any) =>
          this.normalizeMatchStatus(match?.status) !== "completed",
      );
    });

    if (firstPendingIndex >= 0) return firstPendingIndex;
    return Math.max(0, rounds.length - 1);
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

        this.rankedGateway.emitRoomPlayerJoined({
          roomCode,
          code: roomCode,
          userId,
          username: null,
          playerCount: 1,
          maxPlayers: 2,
          status: "waiting",
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
    const roomStatus = String(room.status || "waiting").toLowerCase();
    if (roomStatus === "finished" || roomStatus === "cancelled") {
      throw new BadRequestException("Room is no longer available");
    }

    const members = await this.repo.findRoomMembers(room._id);
    const alreadyJoined = members.some((m: any) => m.userId === userId);
    if (room.status === "playing" && !alreadyJoined) {
      throw new BadRequestException("Room already started");
    }
    if (alreadyJoined) {
      return this.getRoom(code);
    }

    const maxPlayers = Number(room.maxPlayers || 2);
    const currentPlayerCount = Math.max(
      Number(room?.playerCount || 0),
      members.length,
      room?.ownerUserId ? 1 : 0,
    );
    if (currentPlayerCount >= maxPlayers) {
      throw new BadRequestException("Room is full");
    }

    await this.repo.addRoomMember({
      roomId: room._id,
      userId,
      role: "member",
      joinedAt: new Date(),
    });

    const profileRows = await this.repo.findUserProfilesByIds([userId]);
    const profile = profileRows.find((row: any) => row._id === userId) as
      | { username?: string | null }
      | undefined;

    const refreshedMembers = await this.repo.findRoomMembers(room._id);
    const refreshedPlayerCount = Math.max(
      Number(room?.playerCount || 0),
      refreshedMembers.length,
      room?.ownerUserId ? 1 : 0,
    );

    if (refreshedPlayerCount > maxPlayers) {
      await this.repo.removeRoomMember(room._id, userId);
      throw new BadRequestException("Room is full");
    }

    await this.repo.updateRoomByCode(code, {
      playerCount: refreshedPlayerCount,
      updatedAt: new Date(),
    });

    this.rankedGateway.emitRoomPlayerJoined({
      roomCode: String(room.roomCode || room.code || code),
      code: String(room.roomCode || room.code || code),
      userId,
      username: profile?.username || null,
      playerCount: refreshedPlayerCount,
      maxPlayers,
      status: String(room.status || "waiting"),
    });

    return this.getRoom(code);
  }

  async getRoom(code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }
    const members = await this.repo.findRoomMembers(room._id);

    const memberUserIds = Array.from(
      new Set(
        members
          .map((member: any) => String(member?.userId || ""))
          .filter((userId: string) => userId.length > 0),
      ),
    );
    const profiles = await this.repo.findUserProfilesByIds(memberUserIds);
    const profileMap = new Map(
      profiles.map((profile: any) => [String(profile._id || ""), profile]),
    );

    const normalizedMembers = members.map((member: any) => {
      const userId = String(member?.userId || "");
      const profile = profileMap.get(userId) || null;
      return {
        ...member,
        userId,
        username:
          typeof profile?.username === "string" && profile.username.length > 0
            ? profile.username
            : userId,
        avatarUrl:
          typeof profile?.avatarUrl === "string" && profile.avatarUrl.length > 0
            ? profile.avatarUrl
            : null,
      };
    });

    return {
      ...room,
      playerCount: Math.max(
        Number(room?.playerCount || 0),
        normalizedMembers.length,
        room?.ownerUserId ? 1 : 0,
      ),
      members: normalizedMembers,
    };
  }

  async getPublicRooms(options?: { status?: string; limit?: number }) {
    const statusRaw = String(options?.status || "waiting").toLowerCase();
    const statuses =
      statusRaw === "all"
        ? ["waiting", "playing"]
        : statusRaw === "playing"
          ? ["playing"]
          : ["waiting"];
    const limit = Math.max(1, Math.min(100, Number(options?.limit || 30)));

    const rooms = await this.repo.findPublicRooms({ statuses, limit });
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }

    const roomIds = rooms
      .map((room: any) => room?._id)
      .filter(
        (roomId: unknown): roomId is ObjectId | string =>
          roomId instanceof ObjectId || typeof roomId === "string",
      );
    const members = await this.repo.findRoomMembersByRoomIds(roomIds);

    const membersByRoomId = new Map<string, Array<Record<string, unknown>>>();
    for (const member of members) {
      const roomId = String(member?.roomId || "");
      if (!membersByRoomId.has(roomId)) {
        membersByRoomId.set(roomId, []);
      }
      membersByRoomId.get(roomId)!.push(member);
    }

    const userIds = Array.from(
      new Set(
        rooms
          .flatMap((room: any) => {
            const roomId = String(room?._id || "");
            const roomMembers = membersByRoomId.get(roomId) || [];
            return [
              String(room?.ownerUserId || ""),
              ...roomMembers.map((member) => String(member?.userId || "")),
            ];
          })
          .filter((userId) => userId.length > 0),
      ),
    );
    const profiles = await this.repo.findUserProfilesByIds(userIds);
    const profileMap = new Map(
      profiles.map((profile: any) => [String(profile?._id || ""), profile]),
    );

    const items = rooms
      .map((room: any) => {
      const roomId = String(room?._id || "");
      const roomMembers = membersByRoomId.get(roomId) || [];
      const ownerUserId = String(room?.ownerUserId || "");
      const ownerStillPresent = roomMembers.some(
        (member) => String(member?.userId || "") === ownerUserId,
      );
      if (!ownerUserId || !ownerStillPresent) {
        return null;
      }
      const ownerProfile = profileMap.get(ownerUserId);
      const playerCount = Math.max(
        Number(room?.playerCount || 0),
        roomMembers.length,
        ownerUserId ? 1 : 0,
      );
      const maxPlayers = Number(room?.maxPlayers || 2);
      const rawStatus = String(room?.status || "waiting").toLowerCase();
      const hasActiveGame = Boolean(String(room?.activeGameId || "").trim());
      const status =
        rawStatus === "finished" || rawStatus === "cancelled"
          ? rawStatus
          : hasActiveGame
            ? "playing"
            : rawStatus || "waiting";
      const roomCode = String(room?.roomCode || room?.code || "");

      return {
        id: roomId,
        roomCode,
        code: roomCode,
        name:
          typeof room?.name === "string" && room.name.trim().length > 0
            ? room.name
            : null,
        status,
        isPrivate: false,
        timeControl: String(room?.timeControl || "rapid"),
        initialTimeSeconds: Number(room?.initialTimeSeconds || 600),
        playerCount,
        maxPlayers,
        canJoin: status === "waiting" && !hasActiveGame && playerCount < maxPlayers,
        host: {
          userId: ownerUserId || null,
          username:
            typeof ownerProfile?.username === "string" &&
            ownerProfile.username.length > 0
              ? ownerProfile.username
              : ownerUserId || "Chủ phòng",
          avatarUrl:
            typeof ownerProfile?.avatarUrl === "string" &&
            ownerProfile.avatarUrl.length > 0
              ? ownerProfile.avatarUrl
              : null,
        },
        createdAt: room?.createdAt || null,
        updatedAt: room?.updatedAt || null,
      };
      })
      .filter((item) => item !== null) as Array<Record<string, unknown>>;

    const allowedStatuses = new Set(statuses.map((status) => status.toLowerCase()));
    const filteredItems = items.filter((item) =>
      allowedStatuses.has(String(item?.status || "").toLowerCase()),
    );

    return {
      items: filteredItems,
      total: filteredItems.length,
    };
  }

  async leaveRoom(userId: string, code: string) {
    const room = await this.repo.findRoomByCode(code);
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    const roomCode = String(room.roomCode || room.code || code);
    const isOwner = String(room.ownerUserId || "") === String(userId);
    if (isOwner) {
      await this.repo.deleteRoomByCode(code);
      await this.repo.removeRoomMembers(room._id);
      this.rankedGateway.emitRoomCancelled({
        roomCode,
        code: roomCode,
        cancelledByUserId: userId,
        reason: "owner_left",
      });
      return { left: true, cancelled: true, reason: "owner_left" };
    }

    const result = await this.repo.removeRoomMember(room._id, userId);
    if (result.deletedCount === 0) {
      throw new BadRequestException("User is not a member of the room");
    }

    const members = await this.repo.findRoomMembers(room._id);
    await this.repo.updateRoomByCode(code, {
      playerCount: members.length,
      updatedAt: new Date(),
    });

    this.rankedGateway.emitRoomPlayerLeft({
      roomCode,
      code: roomCode,
      userId,
      username: null,
      playerCount: members.length,
      maxPlayers: Number(room.maxPlayers || 2),
      status: String(room.status || "waiting"),
    });

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

    this.rankedGateway.emitRoomGameStarted({
      roomCode: String(room.roomCode || room.code || code),
      code: String(room.roomCode || room.code || code),
      gameId: String(game._id),
      whitePlayerId,
      blackPlayerId,
      status: "playing",
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

    const organizerCandidates = [
      tournament.createdBy,
      tournament.organizerId,
      tournament.ownerUserId,
      (tournament.organizer as Record<string, unknown> | undefined)?.userId,
      (tournament.organizer as Record<string, unknown> | undefined)?._id,
      (tournament.organizer as Record<string, unknown> | undefined)?.id,
    ]
      .map((value) => {
        if (typeof value === "string") {
          const match = value.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
          return match?.[1] || value;
        }
        if (
          value &&
          typeof value === "object" &&
          "toString" in value &&
          typeof (value as { toString?: unknown }).toString === "function"
        ) {
          const asString = (value as { toString: () => string }).toString();
          const match = asString.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
          return match?.[1] || asString;
        }
        return "";
      })
      .filter((value) => value.length > 0);

    if (organizerCandidates.includes(String(userId))) {
      throw new BadRequestException(
        "Organizer cannot join their own tournament",
      );
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

    const activeParticipants = this.buildTournamentParticipantSnapshots(
      participantsRaw,
      latestProfileMap,
      { includeStatuses: ["active"] },
    );

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

    await this.attachTournamentGamesForRound(tournamentId, rounds, 0, {
      activateImmediately: false,
      checkInMinutes: 5,
    });

    const standingsParticipants = this.buildTournamentParticipantSnapshots(
      participantsRaw,
      latestProfileMap,
      { excludeStatuses: ["withdrawn", "pending", "rejected"] },
    );
    const standings = this.buildTournamentStandings(
      standingsParticipants,
      rounds,
    );

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
    }

    return {
      started: true,
      tournamentId,
      status: "ongoing",
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
      standings,
    };
  }

  async setTournamentSeeding(
    principal: TournamentPrincipal,
    tournamentId: string,
    dto: TournamentSeedingDto,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException("Only organizer or admin can set seeding");
    }

    const status = this.normalizeTournamentStatus(tournament.status);
    if (status !== "registration") {
      throw new BadRequestException(
        "Seeding is only allowed before tournament starts",
      );
    }

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participantsRaw =
      await this.repo.findTournamentParticipants(normalizedId);

    const activeParticipants = participantsRaw
      .filter((participant: any) => participant.status === "active")
      .map((participant: any, idx: number) => ({
        userId: String(participant.userId),
        name:
          typeof participant.username === "string" &&
          participant.username.length > 0
            ? participant.username
            : `Player ${idx + 1}`,
        seed: Number(participant.seed || idx + 1),
      }));

    if (activeParticipants.length < 2) {
      throw new BadRequestException(
        "Need at least 2 active participants to seed",
      );
    }

    const activeUserIdSet = new Set(
      activeParticipants.map((participant) => participant.userId),
    );
    const pairUserIds = dto.pairs.flatMap((pair) =>
      [pair.player1UserId, pair.player2UserId]
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0),
    );

    const seen = new Set<string>();
    for (const userId of pairUserIds) {
      if (!activeUserIdSet.has(userId)) {
        throw new BadRequestException(
          `User ${userId} is not an active participant`,
        );
      }
      if (seen.has(userId)) {
        throw new BadRequestException(
          `User ${userId} appears multiple times in seeding`,
        );
      }
      seen.add(userId);
    }

    const rounds = this.createTournamentRoundsFromManualPairs(
      activeParticipants,
      dto.pairs,
    );
    this.refreshBracketRoundStatuses(rounds);
    this.propagateBracketAutoAdvancement(rounds);

    const updated = await this.repo.updateTournamentById(tournamentId, {
      rounds,
      currentRound: 1,
      updatedAt: new Date(),
    });

    this.rankedGateway.emitTournamentRoundUpdate({
      tournamentId,
      roundIndex: 0,
      status: this.normalizeTournamentStatus(updated?.status),
      rounds,
    });

    return {
      seeded: true,
      tournamentId,
      rounds,
    };
  }

  async startTournamentMatch(
    principal: TournamentPrincipal,
    tournamentId: string,
    matchId: string,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException("Only organizer or admin can start match");
    }

    const rounds = this.cloneTournamentRounds(tournament.rounds);
    const found = this.locateTournamentMatch(rounds, matchId);
    if (!found) {
      throw new NotFoundException("Match not found in tournament bracket");
    }

    const match = found.match as any;
    if (this.normalizeMatchStatus(match?.status) === "completed") {
      throw new BadRequestException("Match already completed");
    }

    const gameId = String(match?.gameId || "");
    if (!gameId) {
      throw new BadRequestException("Match room is not opened yet");
    }

    const checkIn =
      match?.checkIn && typeof match.checkIn === "object" ? match.checkIn : {};
    if (!checkIn.player1Ready || !checkIn.player2Ready) {
      throw new BadRequestException(
        "Both players must join the room before the organizer can start",
      );
    }

    const now = new Date();
    match.status = "ongoing";
    match.startedAt = now;
    match.checkIn = {
      ...checkIn,
      startedByOrganizerAt: now,
    };

    await this.repo.updateGameById(gameId, {
      state: "InGame",
      status: "active",
      checkInClosedAt: now,
      noShowDeadlineAt: null,
      updatedAt: now,
    });

    await this.repo.updateTournamentById(tournamentId, {
      rounds,
      currentRound: this.determineTournamentCurrentRound(rounds),
      status: "ongoing",
      updatedAt: now,
    });

    this.rankedGateway.emitTournamentRoundUpdate({
      tournamentId,
      roundIndex: found.roundIndex,
      status: "ongoing",
      rounds,
    });
    this.rankedGateway.emitTournamentMatchReady({
      tournamentId,
      matchId,
      gameId,
      roundIndex: found.roundIndex,
    });
    this.rankedGateway.emitGameStatus(gameId, {
      status: "ongoing",
      gameStatus: "active",
      tournamentId,
      roundIndex: found.roundIndex,
      checkIn: match.checkIn,
    });

    return {
      started: true,
      tournamentId,
      matchId,
      gameId,
      roundIndex: found.roundIndex + 1,
      status: "ongoing",
      rounds,
    };
  }

  async openTournamentRound(
    principal: TournamentPrincipal,
    tournamentId: string,
    dto: TournamentOpenRoundDto,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    if (!this.canManageTournament(principal, tournament)) {
      throw new BadRequestException("Only organizer or admin can open round");
    }

    const rounds = this.cloneTournamentRounds(tournament.rounds);
    if (rounds.length === 0) {
      throw new BadRequestException("Tournament bracket is not initialized");
    }

    const targetRoundIndex = this.resolveTargetRoundIndex(
      rounds,
      dto.roundIndex,
    );
    if (targetRoundIndex > 0) {
      const previousRound = rounds[targetRoundIndex - 1] as any;
      const previousMatches = Array.isArray(previousRound?.matches)
        ? previousRound.matches
        : [];
      const allPreviousDone = previousMatches.every(
        (match: any) =>
          this.normalizeMatchStatus(match?.status) === "completed",
      );
      if (!allPreviousDone) {
        throw new BadRequestException("Previous round is not completed yet");
      }
    }

    await this.attachTournamentGamesForRound(
      tournamentId,
      rounds,
      targetRoundIndex,
      {
        activateImmediately: false,
        checkInMinutes: dto.checkInMinutes,
      },
    );

    const normalizedId = ObjectId.isValid(tournamentId)
      ? new ObjectId(tournamentId)
      : tournamentId;
    const participantsRaw =
      await this.repo.findTournamentParticipants(normalizedId);
    const participantIds = participantsRaw
      .map((participant: any) => String(participant.userId || ""))
      .filter((value: string) => value.length > 0);
    const latestProfiles =
      await this.repo.findUserProfilesByIds(participantIds);
    const latestProfileMap = new Map(
      latestProfiles.map((profile: any) => [
        String(profile._id || profile.userId || ""),
        profile,
      ]),
    );
    const standingsParticipants = this.buildTournamentParticipantSnapshots(
      participantsRaw,
      latestProfileMap,
      { excludeStatuses: ["withdrawn", "pending", "rejected"] },
    );

    const standings = this.buildTournamentStandings(
      standingsParticipants,
      rounds,
    );
    const updated = await this.repo.updateTournamentById(tournamentId, {
      rounds,
      standings,
      currentRound: targetRoundIndex + 1,
      status: "ongoing",
      updatedAt: new Date(),
    });

    this.rankedGateway.emitTournamentRoundUpdate({
      tournamentId,
      roundIndex: targetRoundIndex,
      status: "ongoing",
      rounds,
    });

    return {
      opened: true,
      tournamentId,
      roundIndex: targetRoundIndex + 1,
      status: updated?.status || "ongoing",
      rounds,
    };
  }

  async checkInTournamentMatch(
    userId: string,
    tournamentId: string,
    matchId: string,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    const rounds = this.cloneTournamentRounds(tournament.rounds);
    const found = this.locateTournamentMatch(rounds, matchId);
    if (!found) {
      throw new NotFoundException("Match not found in tournament bracket");
    }

    const match = found.match;
    if (this.normalizeMatchStatus(match?.status) === "completed") {
      throw new BadRequestException("Match already completed");
    }

    const p1Id = String(match?.player1?.userId || "");
    const p2Id = String(match?.player2?.userId || "");
    if (userId !== p1Id && userId !== p2Id) {
      throw new BadRequestException("Only match participants can check in");
    }

    const gameId = String(match?.gameId || "");
    if (!gameId) {
      throw new BadRequestException("Match room is not opened yet");
    }

    const now = new Date();
    const checkIn = {
      player1Ready: Boolean(match?.checkIn?.player1Ready),
      player2Ready: Boolean(match?.checkIn?.player2Ready),
      openedAt: match?.checkIn?.openedAt || now,
      deadlineAt:
        match?.checkIn?.deadlineAt || new Date(now.getTime() + 3 * 60 * 1000),
    } as Record<string, unknown>;

    if (userId === p1Id) {
      checkIn.player1Ready = true;
      checkIn.player1ReadyAt = now;
    } else {
      checkIn.player2Ready = true;
      checkIn.player2ReadyAt = now;
    }

    const bothReady =
      Boolean(checkIn.player1Ready) && Boolean(checkIn.player2Ready);
    match.checkIn = checkIn;

    if (bothReady) {
      match.status = "ready";
    }

    await this.repo.updateTournamentById(tournamentId, {
      rounds,
      updatedAt: now,
    });

    this.rankedGateway.emitGameStatus(gameId, {
      status: bothReady ? "ready" : "scheduled",
      gameStatus: "pending",
      tournamentId,
      roundIndex: found.roundIndex,
      checkIn,
    });
    this.rankedGateway.emitTournamentRoundUpdate({
      tournamentId,
      roundIndex: found.roundIndex,
      status: this.normalizeTournamentStatus(tournament.status),
      rounds,
    });

    return {
      checkedIn: true,
      tournamentId,
      matchId,
      bothReady,
      checkIn,
      gameId,
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

  async resignTournamentMatch(
    userId: string,
    tournamentId: string,
    matchIdOrGameId: string,
  ) {
    const tournament = await this.repo.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    const rounds = this.cloneTournamentRounds(tournament.rounds);
    const found =
      this.locateTournamentMatch(rounds, matchIdOrGameId) ||
      this.locateTournamentMatchByGameId(rounds, matchIdOrGameId);
    if (!found) {
      throw new NotFoundException("Match not found in tournament bracket");
    }

    const match = found.match as any;
    if (this.normalizeMatchStatus(match?.status) === "completed") {
      return {
        alreadyCompleted: true,
        tournamentId,
        matchId: String(match?.id || matchIdOrGameId),
        result: String(match?.result || ""),
        winner: String(match?.winner || ""),
      };
    }

    const player1Id = String(match?.player1?.userId || "");
    const player2Id = String(match?.player2?.userId || "");
    if (userId !== player1Id && userId !== player2Id) {
      throw new BadRequestException("Only match participants can resign");
    }

    const winnerSlot =
      userId === player1Id
        ? TournamentWinnerSlot.PLAYER2
        : TournamentWinnerSlot.PLAYER1;

    const result = await this.updateTournamentMatchResult(
      { userId, roles: ["admin"] },
      tournamentId,
      String(match?.id || matchIdOrGameId),
      { winnerSlot },
    );

    const gameId = String(match?.gameId || "");
    if (ObjectId.isValid(gameId)) {
      await this.repo.updateGameIfNotSaved(gameId, {
        state: "Saved",
        status: "finished",
        result:
          winnerSlot === TournamentWinnerSlot.PLAYER1
            ? "white_win"
            : "black_win",
        endReason: "resignation",
        finishedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      ...result,
      resignedByUserId: userId,
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
    const loserPlayer: any =
      winnerSlot === TournamentWinnerSlot.PLAYER1
        ? match.player2
        : match.player1;

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

    const gameId = String(match?.gameId || "");
    if (ObjectId.isValid(gameId)) {
      await this.repo.updateGameIfNotSaved(gameId, {
        state: "Saved",
        status: "finished",
        result:
          winnerSlot === TournamentWinnerSlot.PLAYER1
            ? "white_win"
            : "black_win",
        rawResult:
          winnerSlot === TournamentWinnerSlot.PLAYER1 ? "1-0" : "0-1",
        endReason: "tournament_result_recorded",
        finishedAt: new Date(),
        updatedAt: new Date(),
      });
    }

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
      .map((participant: any) => String(participant.userId || ""))
      .filter((value: string) => value.length > 0);
    const latestProfiles =
      await this.repo.findUserProfilesByIds(participantIds);
    const latestProfileMap = new Map(
      latestProfiles.map((profile: any) => [
        String(profile._id || profile.userId || ""),
        profile,
      ]),
    );
    const standingsParticipants = this.buildTournamentParticipantSnapshots(
      participantsRaw,
      latestProfileMap,
      { excludeStatuses: ["withdrawn", "pending", "rejected"] },
    );
    const standings = this.buildTournamentStandings(
      standingsParticipants,
      rounds,
    );
    const eliminatedUserId = String(loserPlayer?.userId || "") || null;

    const finalRound = rounds[rounds.length - 1];
    const finalMatch = Array.isArray(finalRound?.matches)
      ? (finalRound.matches[0] as Record<string, unknown> | undefined)
      : undefined;
    const tournamentCompleted =
      Boolean(finalMatch) &&
      this.normalizeMatchStatus(finalMatch?.status) === "completed";

    const updated = await this.repo.updateTournamentById(tournamentId, {
      rounds,
      currentRound: tournamentCompleted
        ? rounds.length
        : this.determineTournamentCurrentRound(rounds),
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

    if (eliminatedUserId) {
      const loserParticipant = participantsRaw.find(
        (participant: any) =>
          String(participant?.userId || "") === eliminatedUserId,
      );
      if (
        loserParticipant &&
        String(loserParticipant?.status || "") === "active"
      ) {
        await this.repo.updateTournamentParticipantStatus(
          normalizedId,
          eliminatedUserId,
          "eliminated",
        );
      }
    }

    return {
      tournamentId,
      matchId,
      result: match.result,
      winner: match.winner,
      eliminatedUserId,
      status:
        updated?.status || (tournamentCompleted ? "completed" : "ongoing"),
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
      standings,
    };
  }

  async createBotGame(userId: string, dto: CreateBotGameDto) {
    const now = new Date();
    const difficultyConfig = this.stockfishService.getDifficultyConfig(
      dto.difficulty,
    );
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
      config: difficultyConfig,
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
    const difficulty = session?.difficulty || "normal";

    const stockfishMove = await this.stockfishService.getBestMove(
      dto.fen,
      difficulty,
    );
    const move =
      stockfishMove && this.isLegalUciMove(dto.fen, stockfishMove.bestMoveUci)
        ? stockfishMove
        : this.getFallbackLegalMove(dto.fen, String(difficulty));

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
        "hard",
      );
      stockfishBestMove =
        stockfishMove?.bestMoveUci ||
        this.getFallbackLegalMove(fen, "hard")?.bestMoveUci ||
        "N/A";
    }

    const playerColor =
      String(dto.playerColor || "").toLowerCase() === "black"
        ? "black"
        : "white";
    const playerSide = String(dto.playerSide || "").trim();

    const hint = await this.groqService.getTacticalCoachHint(
      pgn,
      detailLevel,
      stockfishBestMove,
      {
        playerColor,
        playerSide,
      },
    );

    return {
      userId,
      hint,
      detailLevel,
      stockfishBestMove,
      playerColor,
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
    const storedGame = await this.repo.findGameById(gameId);
    const game = storedGame
      ? await this.enrichReplayGamePlayers(
          storedGame as Record<string, unknown>,
        )
      : null;
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

    const fallbackMove = this.getFallbackLegalMove(fen, "expert");
    const stockfishBestMove =
      stockfishMove?.bestMoveUci || fallbackMove?.bestMoveUci || "N/A";
    const score =
      Number.isFinite(parsedScore) && parsedScore !== 0
        ? parsedScore
        : Number(stockfishMove?.evaluation ?? fallbackMove?.evaluation ?? 0);

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
      await this.repo.replaceGameMoves(
        gameId,
        Array.isArray(game.moves)
          ? (game.moves as Array<Record<string, unknown>>)
          : [],
        new Date(),
      );
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
      endReason:
        typeof payload.endReason === "string" && payload.endReason.trim().length > 0
          ? payload.endReason.trim()
          : payload.result === "Draw"
            ? "draw"
            : "completed",
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
      await this.repo.replaceGameMoves(
        gameId,
        Array.isArray(latest?.moves)
          ? (latest.moves as Array<Record<string, unknown>>)
          : [],
        now,
      );
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

    await this.repo.replaceGameMoves(
      gameId,
      Array.isArray(moves) ? (moves as Array<Record<string, unknown>>) : [],
      now,
    );

    if (normalizedMode === "room") {
      const roomCodeRaw =
        typeof payload?.metadata?.roomCode === "string"
          ? payload.metadata.roomCode
          : typeof game?.roomCode === "string"
            ? game.roomCode
            : "";
      const roomCode = String(roomCodeRaw || "").trim();
      if (roomCode) {
        await this.repo.updateRoomByCode(roomCode, {
          status: "finished",
          activeGameId: null,
          updatedAt: now,
          finishedAt: now,
        });
      }
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
