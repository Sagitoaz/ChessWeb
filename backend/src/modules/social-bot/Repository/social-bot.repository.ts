import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { MongoService } from "src/shared/db/mongo.service";

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
  async addRoomMember(doc: Record<string, unknown>) {}
}
