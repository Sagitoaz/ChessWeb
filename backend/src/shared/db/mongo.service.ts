import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Db, MongoClient } from 'mongodb'
import { env } from '../config/env'
import { COLLECTIONS } from './collections'

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
    this.logger.log(`[db] Connected to MongoDB database: ${env.mongodbDbName}`)
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
        .collection(COLLECTIONS.USERS)
        .createIndex({ username: 1 }, { unique: true, name: 'uq_users_username' }),
      this.db.collection(COLLECTIONS.USERS).createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: 'string' } },
          name: 'uq_users_email',
        }
      ),
      this.db.collection(COLLECTIONS.USERS).createIndex(
        { googleId: 1 },
        {
          unique: true,
          partialFilterExpression: { googleId: { $type: 'string' } },
          name: 'uq_users_googleId',
        }
      ),
      this.db
        .collection(COLLECTIONS.GAME_MOVES)
        .createIndex({ gameId: 1, ply: 1 }, { unique: true, name: 'uq_game_moves_game_ply' }),
      this.db.collection(COLLECTIONS.AUTH_SESSIONS).createIndex(
        { userId: 1, sessionId: 1, status: 1 },
        { name: 'ix_auth_sessions_user_session_status' }
      ),
      this.db.collection(COLLECTIONS.AUTH_TOKENS).createIndex(
        { userId: 1, sessionId: 1, purpose: 1, status: 1 },
        { name: 'ix_auth_tokens_user_session_purpose_status' }
      ),
      this.db.collection(COLLECTIONS.PLAYER_RATINGS).createIndex(
        { userId: 1, mode: 1 },
        { unique: true, name: 'uq_player_ratings_user_mode' }
      ),
      this.db.collection(COLLECTIONS.PLAYER_MODE_STATS).createIndex(
        { userId: 1, mode: 1 },
        { unique: true, name: 'uq_player_mode_stats_user_mode' }
      ),
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
