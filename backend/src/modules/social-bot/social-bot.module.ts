import { Module } from '@nestjs/common'
import { SocialBotController } from './social-bot.controller'

@Module({
  controllers: [SocialBotController],
})
export class SocialBotModule {}
