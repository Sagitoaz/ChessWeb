import { Module } from '@nestjs/common'
import { CompetitionController } from './competition.controller'
import { CompetitionService } from './competition.service'
import { RankedGateway } from './ranked.gateway'

@Module({
  controllers: [CompetitionController],
  providers: [CompetitionService, RankedGateway],
})
export class CompetitionModule {}
