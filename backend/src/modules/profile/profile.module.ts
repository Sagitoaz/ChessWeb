import { Module } from '@nestjs/common'
import { ProfileController } from './profile.controller'
import { ProfileRepository } from './profile.repository'
import { PROFILE_REPOSITORY, ProfileService } from './profile.service'

@Module({
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: PROFILE_REPOSITORY,
      useClass: ProfileRepository,
    },
  ],
})
export class ProfileModule {}
