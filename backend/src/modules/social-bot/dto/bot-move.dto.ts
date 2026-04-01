import { IsString, MaxLength } from "class-validator";

export class BotMoveDto {
  @IsString()
  @MaxLength(64)
  sessionId!: string;

  @IsString()
  @MaxLength(120)
  fen!: string;
}
