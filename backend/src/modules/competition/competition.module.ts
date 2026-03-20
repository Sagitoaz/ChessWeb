import { Module } from '@nestjs/common'
import { CompetitionController } from './competition.controller'

@Module({
  controllers: [CompetitionController],
})
export class CompetitionModule {}
