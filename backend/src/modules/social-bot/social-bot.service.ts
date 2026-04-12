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
import {
  TournamentWinnerSlot,
  UpdateTournamentMatchResultDto,
} from "./dto/manage-tournament-result.dto";
import { SaveBotGameDto } from "./dto/save-bot-game.dto";
import { StockfishService } from "./stockfish.service";

interface TournamentPrincipal {
  userId: string;
  roles: string[];
}

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
    return (
      tournament.createdBy === principal.userId ||
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
          (player1Name !== "TBD" || player2Name !== "TBD")
        ) {
          match.status = "scheduled";
        }
      }
    }
  }

  private createTournamentRounds(
    participants: Array<{ name: string; seed: number }>,
  ) {
    const nextPowerOfTwo =
      participants.length <= 1
        ? 2
        : Math.pow(2, Math.ceil(Math.log2(participants.length)));

    const bracketPlayers = [...participants];
    while (bracketPlayers.length < nextPowerOfTwo) {
      bracketPlayers.push({ name: "TBD", seed: 0 });
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
          score: winner === player1.name ? 1 : winner ? 0 : null,
        },
        player2: {
          name: player2.name,
          seed: player2.seed || null,
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
        player1: { name: "TBD", seed: null, score: null },
        player2: { name: "TBD", seed: null, score: null },
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

    const normalizedStatus = this.normalizeTournamentStatus(tournament.status);
    if (normalizedStatus !== "registration") {
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
        rating: Number(participant.rating || 1200),
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
        );
      }
    }

    const updated = await this.repo.updateTournamentById(tournamentId, {
      status: "ongoing",
      formatLabel: this.toTournamentFormatLabel(tournament.format),
      currentRound: 1,
      startedAt: new Date(),
      rounds,
      updatedAt: new Date(),
    });

    return {
      started: true,
      tournamentId,
      status: "ongoing",
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
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

    const currentParticipants = await this.repo.countTournamentParticipants(
      normalizedId,
    );
    const maxParticipants = Number(tournament.maxParticipants || 0);
    if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
      throw new BadRequestException("Tournament is full");
    }

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

    await this.repo.removeTournamentParticipant(normalizedId, participantUserId);

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
    );

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
      winner: tournamentCompleted
        ? finalMatch?.winner || null
        : tournament.winner || null,
      completedAt: tournamentCompleted
        ? new Date()
        : tournament.completedAt || null,
      updatedAt: new Date(),
    });

    return {
      tournamentId,
      matchId,
      result: match.result,
      winner: match.winner,
      status:
        updated?.status || (tournamentCompleted ? "completed" : "ongoing"),
      rounds: Array.isArray(updated?.rounds) ? updated.rounds : rounds,
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
