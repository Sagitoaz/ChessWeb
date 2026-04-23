import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Db, MongoClient } from 'mongodb'
import { env } from '../config/env'

@Injectable()
export class MongoService implements OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name)
  private client: MongoClient | null = null
  private db: Db | null = null
  private indexesEnsured = false

  async connect(): Promise<Db> {
    if (this.db) return this.db

    this.client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })

    await this.client.connect()
    this.db = this.client.db(env.mongodbDbName)
    await this.ensureCoreIndexes()
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

  private async ensureCoreIndexes(): Promise<void> {
    if (!this.db || this.indexesEnsured) return

    const attempts: Array<Promise<unknown>> = [
      this.db
        .collection('user_profiles')
        .createIndex({ username: 1 }, { unique: true, name: 'uq_user_profiles_username' }),
      this.db.collection('user_profiles').createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: 'string' } },
          name: 'uq_user_profiles_email',
        }
      ),
      this.db.collection('user_profiles').createIndex(
        { googleId: 1 },
        {
          unique: true,
          partialFilterExpression: { googleId: { $type: 'string' } },
          name: 'uq_user_profiles_googleId',
        }
      ),
      this.db
        .collection('game_moves')
        .createIndex({ gameId: 1, ply: 1 }, { unique: true, name: 'uq_game_moves_game_ply' }),
    ]

    const results = await Promise.allSettled(attempts)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `[db] Failed to ensure index #${index + 1}: ${(result.reason as Error)?.message || String(result.reason)}`
        )
      }
    })

    this.indexesEnsured = true
  }
}
