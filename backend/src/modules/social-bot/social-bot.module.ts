import { Module } from "@nestjs/common";
import { SocialBotController } from "./Controller/social-bot.controller";
import { SocialBotService } from "./Service/social-bot.service";
import { SocialBotRepository } from "./Repository/social-bot.repository";

@Module({
  controllers: [SocialBotController],
  providers: [SocialBotService, SocialBotRepository],
})
export class SocialBotModule {}
