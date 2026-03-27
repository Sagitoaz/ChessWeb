import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { MongoService } from "../../../shared/db/mongo.service";

@Injectable()
export class SocialBotRepository {
  constructor(private readonly mongo: MongoService) {}
  private get db() {
    return this.mongo.getDb();
  }
  async createRoom(doc: Record<string, unknown>) {
    const result = await this.db.collection("room").insertOne(doc);
    // trong mongod db không dùng table dùng collection
    return { ...doc, _id: result.insertedId };
  }
  async addRoomMember(doc: Record<string, unknown>) {
    await this.db.collection("room_members").insertOne(doc);
    return doc;
  }
  async findRoomByCode(RoomCode: string) {
    return await this.db.collection("rooms").findOne({ code: RoomCode });
  }
  async findRoomMembers(roomId: ObjectId | string) {
    return await this.db.collection("room_members").find({ roomId }).toArray();
  }
  async removeRoomMember(roomId: ObjectId | string, userId: string) {
    return this.db.collection("room_members").deleteOne({ roomId, userId });
  }
  async findTournamentById(id: string) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const _id = new ObjectId(id);
    return this.db.collection("tournaments").findOne({ _id });
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
        { $set: { responsePayload, status, updateAt: new Date() } },
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
    const _id = new ObjectId(id);
    return this.db.collection("games").findOne({ _id });
  }
}
