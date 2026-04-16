import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Db, MongoClient } from 'mongodb'
import { env } from '../config/env'

@Injectable()
export class MongoService implements OnModuleDestroy {
  private client: MongoClient | null = null
  private db: Db | null = null

  async connect(): Promise<Db> {
    if (this.db) return this.db

    this.client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })

    await this.client.connect()
    this.db = this.client.db(env.mongodbDbName)
    return this.db
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('[db] MongoDB is not connected. Call connect() first.')
    }
    return this.db
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
    }
  }
}
