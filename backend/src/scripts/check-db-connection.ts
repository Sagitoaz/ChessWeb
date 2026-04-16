import { MongoService } from '../shared/db/mongo.service'

const run = async (): Promise<void> => {
  const mongo = new MongoService()
  try {
    const db = await mongo.connect()
    await db.command({ ping: 1 })
    console.log('[db:check] MongoDB connection OK')
    process.exit(0)
  } catch (error) {
    console.error('[db:check] MongoDB connection FAILED')
    console.error((error as Error).message)
    process.exit(1)
  } finally {
    await mongo.onModuleDestroy()
  }
}

void run()
