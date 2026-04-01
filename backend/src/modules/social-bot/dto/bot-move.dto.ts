import { IsString, MaxLength } from "class-validator";

export class BotMoveDto {
  @IsString()
  @MaxLength(10)
  sessionId!: string;

  @IsString()
  @MaxLength(10)
  fen!: string;
}
