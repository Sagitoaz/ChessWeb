import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { env } from './shared/config/env'
import { MongoService } from './shared/db/mongo.service'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.enableCors()
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    })
  )

  const mongoService = app.get(MongoService)
  await mongoService.connect()

  await app.listen(env.port)
  console.log(`[server] NestJS backend listening on port ${env.port}`)
}

bootstrap().catch((error) => {
  console.error('[server] Failed to start backend', error)
  process.exit(1)
})
