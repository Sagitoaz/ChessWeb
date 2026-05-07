import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../../shared/db/collections";
import { MongoService } from "../../shared/db/mongo.service";

@Injectable()
export class SocialBotRepository {
  constructor(private readonly mongo: MongoService) {}

  private get db() {
    return this.mongo.getDb();
  }

  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  private resolveColorPlayerId(
    doc: Record<string, unknown>,
    color: "white" | "black",
  ): string | null {
    const legacyKey = color === "white" ? "whitePlayerId" : "blackPlayerId";
    const legacy = doc[legacyKey];
    if (typeof legacy === "string" && legacy.length > 0) {
      return legacy;
    }

    const players = Array.isArray(doc.players)
      ? (doc.players as Array<Record<string, unknown>>)
      : [];
    const player = players.find(
      (entry) =>
        String(entry?.color || "").toLowerCase() === color &&
        typeof entry?.userId === "string" &&
        String(entry.userId).length > 0,
    );

    return typeof player?.userId === "string" ? player.userId : null;
  }

  private buildPlayers(doc: Record<string, unknown>) {
    if (Array.isArray(doc.players) && doc.players.length > 0) {
      return doc.players;
    }

    const whitePlayerId = this.resolveColorPlayerId(doc, "white");
    const blackPlayerId = this.resolveColorPlayerId(doc, "black");
    return [
      whitePlayerId ? { userId: whitePlayerId, color: "white" } : null,
      blackPlayerId ? { userId: blackPlayerId, color: "black" } : null,
    ].filter(Boolean);
  }

  private withV2GameShape(doc: Record<string, unknown>) {
    const moves = Array.isArray(doc.moves)
      ? (doc.moves as Array<Record<string, unknown>>)
      : [];
    const initialFen =
      typeof doc.initialFen === "string" && doc.initialFen.length > 0
        ? doc.initialFen
        : typeof doc.initialFEN === "string" && doc.initialFEN.length > 0
          ? doc.initialFEN
          : this.initialFen;

    return {
      ...doc,
      players: this.buildPlayers(doc),
      initialFen,
      currentFen:
        typeof doc.currentFen === "string" && doc.currentFen.length > 0
          ? doc.currentFen
          : initialFen,
      totalMoves:
        typeof doc.totalMoves === "number" && Number.isFinite(doc.totalMoves)
          ? doc.totalMoves
          : Number(
              (doc.metadata as { totalMoves?: unknown } | undefined)
                ?.totalMoves ?? moves.length,
            ),
    };
  }

  private withV2GameUpdate(update: Record<string, unknown>) {
    const next = this.withV2GameShape(update);
    if (!Object.prototype.hasOwnProperty.call(update, "players")) {
      delete next.players;
    }
    if (
      !Object.prototype.hasOwnProperty.call(update, "initialFen") &&
      !Object.prototype.hasOwnProperty.call(update, "initialFEN")
    ) {
      delete next.initialFen;
    }
    if (!Object.prototype.hasOwnProperty.call(update, "currentFen")) {
      delete next.currentFen;
    }
    if (
      !Object.prototype.hasOwnProperty.call(update, "totalMoves") &&
      !Object.prototype.hasOwnProperty.call(update, "metadata") &&
      !Object.prototype.hasOwnProperty.call(update, "moves")
    ) {
      delete next.totalMoves;
    }
    return next;
  }

  private normalizeMovesFromUpdate(
    update: Record<string, unknown>,
  ): Array<Record<string, unknown>> | null {
    if (!Object.prototype.hasOwnProperty.call(update, "moves")) {
      return null;
    }

    return Array.isArray(update.moves)
      ? (update.moves as Array<Record<string, unknown>>)
      : [];
  }

  private async syncGameMovesFromUpdate(
    gameId: string,
    update: Record<string, unknown>,
    now: Date,
  ): Promise<void> {
    const moves = this.normalizeMovesFromUpdate(update);
    if (moves === null) {
      return;
    }

    await this.replaceGameMoves(gameId, moves, now);
  }

  private normalizeRoundsFromUpdate(
    update: Record<string, unknown>,
  ): Array<Record<string, unknown>> | null {
    if (!Object.prototype.hasOwnProperty.call(update, "rounds")) {
      return null;
    }

    return Array.isArray(update.rounds)
      ? (update.rounds as Array<Record<string, unknown>>)
      : [];
  }

  private async syncTournamentMatchesFromUpdate(
    tournamentId: string,
    update: Record<string, unknown>,
    now: Date,
  ): Promise<void> {
    const rounds = this.normalizeRoundsFromUpdate(update);
    if (rounds === null) {
      return;
    }

    await this.replaceTournamentMatches(tournamentId, rounds, now);
  }

  async createRoom(doc: Record<string, unknown>) {
    const result = await this.db.collection("rooms").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async addRoomMember(doc: Record<string, unknown>) {
    await this.db.collection("room_members").insertOne(doc);
    return doc;
  }

  async findRoomByCode(roomCode: string) {
    return this.db.collection("rooms").findOne({
      $or: [{ roomCode }, { code: roomCode }],
    });
  }

  async findPublicRooms(options?: { limit?: number; statuses?: string[] }) {
    const limit = Math.max(1, Math.min(100, Number(options?.limit || 30)));
    const statuses = Array.isArray(options?.statuses)
      ? options.statuses.filter(
          (status): status is string =>
            typeof status === "string" && status.length > 0,
        )
      : [];

    const query: Record<string, unknown> = {
      isPrivate: false,
    };
    if (statuses.length > 0) {
      query.status = { $in: statuses };
    }

    return this.db
      .collection("rooms")
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateRoomByCode(roomCode: string, update: Record<string, unknown>) {
    return this.db
      .collection("rooms")
      .findOneAndUpdate(
        { $or: [{ roomCode }, { code: roomCode }] },
        { $set: update },
        { returnDocument: "after" },
      );
  }

  async findRoomMembers(roomId: ObjectId | string) {
    return this.db.collection("room_members").find({ roomId }).toArray();
  }

  async findRoomMembersByRoomIds(roomIds: Array<ObjectId | string>) {
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return [];
    }
    return this.db
      .collection("room_members")
      .find({ roomId: { $in: roomIds } })
      .toArray();
  }

  async removeRoomMember(roomId: ObjectId | string, userId: string) {
    return this.db.collection("room_members").deleteOne({ roomId, userId });
  }

  async removeRoomMembers(roomId: ObjectId | string) {
    return this.db.collection("room_members").deleteMany({ roomId });
  }

  async deleteRoomByCode(roomCode: string) {
    return this.db.collection("rooms").deleteOne({
      $or: [{ roomCode }, { code: roomCode }],
    });
  }

  async findTournamentById(id: string) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new ObjectId(id);
    return this.db.collection("tournaments").findOne({ _id: objectId });
  }

  async updateTournamentById(id: string, update: Record<string, unknown>) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new ObjectId(id);
    const now =
      update.updatedAt instanceof Date ? update.updatedAt : new Date();
    const result = await this.db
      .collection("tournaments")
      .findOneAndUpdate(
        { _id: objectId },
        { $set: update },
        { returnDocument: "after" },
      );

    await this.syncTournamentMatchesFromUpdate(id, update, now);

    return result;
  }

  async findTournamentsByStatus(statuses: string[]) {
    if (!Array.isArray(statuses) || statuses.length === 0) {
      return [];
    }

    return this.db
      .collection("tournaments")
      .find({ status: { $in: statuses } })
      .toArray();
  }

  async findTournamentParticipants(tournamentId: ObjectId | string) {
    return this.db
      .collection("tournament_participants")
      .find({ tournamentId })
      .sort({ joinedAt: 1 })
      .toArray();
  }

  async findTournamentParticipant(
    tournamentId: ObjectId | string,
    userId: string,
  ) {
    return this.db
      .collection("tournament_participants")
      .findOne({ tournamentId, userId });
  }

  async countTournamentParticipants(tournamentId: ObjectId | string) {
    return this.db
      .collection("tournament_participants")
      .countDocuments({ tournamentId, status: { $ne: "withdrawn" } });
  }

  async findUserProfilesByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    return this.db
      .collection<{
        _id: string;
        username?: string;
        displayName?: string;
        rating?: number;
        avatarUrl?: string;
      }>(
        COLLECTIONS.USERS,
      )
      .find(
        { _id: { $in: userIds } },
        {
          projection: {
            _id: 1,
            username: 1,
            displayName: 1,
            rating: 1,
            avatarUrl: 1,
          },
        },
      )
      .toArray();
  }

  async addTournamentParticipant(doc: Record<string, unknown>) {
    await this.db.collection("tournament_participants").insertOne(doc);
    return doc;
  }

  async updateTournamentParticipantStatus(
    tournamentId: ObjectId | string,
    userId: string,
    status: string,
  ) {
    return this.db
      .collection("tournament_participants")
      .findOneAndUpdate(
        { tournamentId, userId },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
  }

  async removeTournamentParticipant(
    tournamentId: ObjectId | string,
    userId: string,
  ) {
    return this.db
      .collection("tournament_participants")
      .deleteOne({ tournamentId, userId });
  }

  async createBotSession(doc: Record<string, unknown>) {
    const result = await this.db.collection(COLLECTIONS.BOT_SESSIONS).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async findBotSessionById(id: string | ObjectId) {
    let sessionId: ObjectId | null = null;
    if (typeof id === "string") {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      sessionId = new ObjectId(id);
    } else {
      sessionId = id;
    }
    return this.db.collection(COLLECTIONS.BOT_SESSIONS).findOne({ _id: sessionId });
  }

  async createBotMoveRequest(doc: Record<string, unknown>) {
    const result = await this.db.collection(COLLECTIONS.BOT_MOVE_REQUESTS).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async updateBotMoveRequestResponse(
    id: ObjectId,
    responsePayload: unknown,
    status: string,
  ) {
    await this.db
      .collection(COLLECTIONS.BOT_MOVE_REQUESTS)
      .updateOne(
        { _id: id },
        { $set: { responsePayload, status, updatedAt: new Date() } },
      );
  }

  async createGame(doc: Record<string, unknown>) {
    const normalizedDoc = this.withV2GameShape(doc);
    const result = await this.db.collection(COLLECTIONS.GAMES).insertOne(normalizedDoc);
    return { ...normalizedDoc, _id: result.insertedId };
  }

  async findGameById(id: string) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new ObjectId(id);
    return this.db.collection(COLLECTIONS.GAMES).findOne({ _id: objectId });
  }

  async updateGameById(id: string, update: Record<string, unknown>) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const objectId = new ObjectId(id);
    const now =
      update.updatedAt instanceof Date ? update.updatedAt : new Date();
    const result = await this.db
      .collection(COLLECTIONS.GAMES)
      .findOneAndUpdate(
        { _id: objectId },
        { $set: this.withV2GameUpdate(update) },
        { returnDocument: "after" },
      );

    await this.syncGameMovesFromUpdate(id, update, now);

    return result;
  }

  async updateGameIfNotSaved(id: string, update: Record<string, unknown>) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const objectId = new ObjectId(id);
    const now =
      update.updatedAt instanceof Date ? update.updatedAt : new Date();
    const result = await this.db
      .collection(COLLECTIONS.GAMES)
      .findOneAndUpdate(
        { _id: objectId, state: { $ne: "Saved" } },
        { $set: this.withV2GameUpdate(update) },
        { returnDocument: "after" },
      );

    if (result) {
      await this.syncGameMovesFromUpdate(id, update, now);
    }

    return result;
  }

  async replaceGameMoves(
    gameId: string,
    moves: Array<Record<string, unknown>>,
    now: Date,
  ) {
    const collection = this.db.collection(COLLECTIONS.GAME_MOVES);
    await collection.deleteMany({ gameId });

    if (!Array.isArray(moves) || moves.length === 0) {
      return { insertedCount: 0 };
    }

    const operations = moves.map((move, index) => {
      const ply =
        typeof move?.ply === "number" && Number.isFinite(move.ply)
          ? Number(move.ply)
          : index + 1;

      return {
        insertOne: {
          document: {
            gameId,
            ply,
            san:
              typeof move?.san === "string" ? String(move.san).trim() : null,
            uci:
              typeof move?.uci === "string" ? String(move.uci).trim() : null,
            from:
              typeof move?.from === "string" ? String(move.from).trim() : null,
            to: typeof move?.to === "string" ? String(move.to).trim() : null,
            piece:
              typeof move?.piece === "string"
                ? String(move.piece).trim()
                : null,
            color:
              typeof move?.color === "string"
                ? String(move.color).trim()
                : null,
            captured:
              typeof move?.captured === "string"
                ? String(move.captured).trim()
                : null,
            promotion:
              typeof move?.promotion === "string"
                ? String(move.promotion).trim()
                : null,
            isCheck: Boolean(move?.isCheck),
            isCheckmate: Boolean(move?.isCheckmate),
            timestamp:
              typeof move?.timestamp === "string"
                ? move.timestamp
                : now.toISOString(),
            rawMove: move,
            createdAt: now,
            updatedAt: now,
          },
        },
      };
    });

    const result = await collection.bulkWrite(operations, { ordered: true });
    return { insertedCount: Number(result.insertedCount || 0) };
  }

  async replaceTournamentMatches(
    tournamentId: string,
    rounds: Array<Record<string, unknown>>,
    now: Date,
  ) {
    const collection = this.db.collection<Record<string, unknown>>(
      "tournament_matches",
    );
    await collection.deleteMany({ tournamentId });

    if (!Array.isArray(rounds) || rounds.length === 0) {
      return { insertedCount: 0 };
    }

    const documents = rounds.flatMap((round, roundIndex) => {
      const matches = Array.isArray(round?.matches)
        ? (round.matches as Array<Record<string, unknown>>)
        : [];

      return matches.map((match, matchIndex) => {
        const matchId =
          typeof match?.id === "string" && match.id.trim().length > 0
            ? match.id.trim()
            : `r${roundIndex + 1}-m${matchIndex + 1}`;
        const player1 =
          match?.player1 && typeof match.player1 === "object"
            ? (match.player1 as Record<string, unknown>)
            : {};
        const player2 =
          match?.player2 && typeof match.player2 === "object"
            ? (match.player2 as Record<string, unknown>)
            : {};

        return {
          _id: new ObjectId(),
          matchKey: `${tournamentId}:${matchId}`,
          tournamentId,
          matchId,
          roundIndex,
          roundNumber: roundIndex + 1,
          roundName:
            typeof round?.name === "string" && round.name.trim().length > 0
              ? round.name.trim()
              : `Round ${roundIndex + 1}`,
          status:
            typeof match?.status === "string" ? String(match.status) : "pending",
          result: typeof match?.result === "string" ? match.result : null,
          winner: typeof match?.winner === "string" ? match.winner : null,
          gameId:
            typeof match?.gameId === "string" && match.gameId.trim().length > 0
              ? match.gameId.trim()
              : null,
          nextMatchId:
            typeof match?.nextMatchId === "string" ? match.nextMatchId : null,
          nextSlot:
            typeof match?.nextSlot === "string" ? match.nextSlot : null,
          player1: {
            userId:
              typeof player1.userId === "string" ? player1.userId : null,
            name: typeof player1.name === "string" ? player1.name : null,
            seed: player1.seed ?? null,
            score: player1.score ?? null,
          },
          player2: {
            userId:
              typeof player2.userId === "string" ? player2.userId : null,
            name: typeof player2.name === "string" ? player2.name : null,
            seed: player2.seed ?? null,
            score: player2.score ?? null,
          },
          checkIn:
            match?.checkIn && typeof match.checkIn === "object"
              ? match.checkIn
              : null,
          startedAt: match?.startedAt ?? null,
          completedAt: match?.completedAt ?? null,
          createdAt: now,
          updatedAt: now,
          rawMatch: match,
        };
      });
    });

    if (documents.length === 0) {
      return { insertedCount: 0 };
    }

    const result = await collection.insertMany(documents, { ordered: true });
    return { insertedCount: Number(result.insertedCount || 0) };
  }

  async updateUserStatsByOutcome(
    userId: string,
    outcome: "win" | "lose" | "draw",
    now: Date,
  ) {
    const inc = {
      gamesPlayed: 1,
      totalGames: 1,
      wins: outcome === "win" ? 1 : 0,
      losses: outcome === "lose" ? 1 : 0,
      draws: outcome === "draw" ? 1 : 0,
    };

    await this.db
      .collection<{ _id: string }>(COLLECTIONS.PLAYER_MODE_STATS)
      .updateOne(
        { _id: `${userId}:bot` },
        {
          $inc: {
            gamesPlayed: inc.gamesPlayed,
            wins: inc.wins,
            losses: inc.losses,
            draws: inc.draws,
          },
          $set: { updatedAt: now },
          $setOnInsert: {
            _id: `${userId}:bot`,
            userId,
            mode: "bot",
            createdAt: now,
          },
        },
        { upsert: true },
      );
  }
}
