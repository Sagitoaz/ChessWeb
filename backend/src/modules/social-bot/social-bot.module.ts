import { Module } from "@nestjs/common";
import { SocialBotController } from "./social-bot.controller";
import { SocialBotService } from "./social-bot.service";
import { SocialBotRepository } from "./social-bot.repository";
import { StockfishService } from "./stockfish.service";
import { GroqService } from "./groq.service";

@Module({
  controllers: [SocialBotController],
  providers: [
    SocialBotService,
    SocialBotRepository,
    StockfishService,
    GroqService,
  ],
})
export class SocialBotModule {}
