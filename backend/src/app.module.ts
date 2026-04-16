import { Module } from '@nestjs/common'
import { MongoModule } from './shared/db/mongo.module'
import { AuthSharedModule } from './shared/auth/auth-shared.module'
import { HealthModule } from './modules/health/health.module'
import { IdentityModule } from './modules/identity/identity.module'
import { ProfileModule } from './modules/profile/profile.module'
import { CompetitionModule } from './modules/competition/competition.module'
import { SocialBotModule } from './modules/social-bot/social-bot.module'

@Module({
  imports: [MongoModule, AuthSharedModule, HealthModule, IdentityModule, ProfileModule, CompetitionModule, SocialBotModule],
})
export class AppModule {}
