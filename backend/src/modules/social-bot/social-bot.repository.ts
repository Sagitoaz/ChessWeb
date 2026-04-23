import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { MongoService } from "../../shared/db/mongo.service";

@Injectable()
export class SocialBotRepository {
  constructor(private readonly mongo: MongoService) {}

  private get db() {
    return this.mongo.getDb();
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
    return this.db
      .collection("tournaments")
      .findOneAndUpdate(
        { _id: objectId },
        { $set: update },
        { returnDocument: "after" },
      );
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
        rating?: number;
        avatarUrl?: string;
      }>(
        "user_profiles",
      )
      .find(
        { _id: { $in: userIds } },
        { projection: { _id: 1, username: 1, rating: 1, avatarUrl: 1 } },
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
    const result = await this.db.collection("bot_sessions").insertOne(doc);
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
    return this.db.collection("bot_sessions").findOne({ _id: sessionId });
  }

  async createBotMoveRequest(doc: Record<string, unknown>) {
    const result = await this.db.collection("bot_move_requests").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async updateBotMoveRequestResponse(
    id: ObjectId,
    responsePayload: unknown,
    status: string,
  ) {
    await this.db
      .collection("bot_move_requests")
      .updateOne(
        { _id: id },
        { $set: { responsePayload, status, updatedAt: new Date() } },
      );
  }

  async createGame(doc: Record<string, unknown>) {
    const result = await this.db.collection("games").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async findGameById(id: string) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new ObjectId(id);
    return this.db.collection("games").findOne({ _id: objectId });
  }

  async updateGameById(id: string, update: Record<string, unknown>) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const objectId = new ObjectId(id);
    const result = await this.db
      .collection("games")
      .findOneAndUpdate(
        { _id: objectId },
        { $set: update },
        { returnDocument: "after" },
      );

    return result;
  }

  async updateGameIfNotSaved(id: string, update: Record<string, unknown>) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const objectId = new ObjectId(id);
    return this.db
      .collection("games")
      .findOneAndUpdate(
        { _id: objectId, state: { $ne: "Saved" } },
        { $set: update },
        { returnDocument: "after" },
      );
  }

  async replaceGameMoves(
    gameId: string,
    moves: Array<Record<string, unknown>>,
    now: Date,
  ) {
    const collection = this.db.collection("game_moves");
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

    await this.db.collection("user_stats").updateOne(
      { userId },
      {
        $inc: inc,
        $set: { updatedAt: now },
        $setOnInsert: { userId, createdAt: now },
      },
      { upsert: true },
    );
  }
}
