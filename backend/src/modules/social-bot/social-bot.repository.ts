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
    return this.db.collection("rooms").findOne({ code: roomCode });
  }

  async updateRoomByCode(roomCode: string, update: Record<string, unknown>) {
    return this.db
      .collection("rooms")
      .findOneAndUpdate(
        { code: roomCode },
        { $set: update },
        { returnDocument: "after" },
      );
  }

  async findRoomMembers(roomId: ObjectId | string) {
    return this.db.collection("room_members").find({ roomId }).toArray();
  }

  async removeRoomMember(roomId: ObjectId | string, userId: string) {
    return this.db.collection("room_members").deleteOne({ roomId, userId });
  }

  async findTournamentById(id: string) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objectId = new ObjectId(id);
    return this.db.collection("tournaments").findOne({ _id: objectId });
  }

  async addTournamentParticipant(doc: Record<string, unknown>) {
    await this.db.collection("tournament_participants").insertOne(doc);
    return doc;
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
}
