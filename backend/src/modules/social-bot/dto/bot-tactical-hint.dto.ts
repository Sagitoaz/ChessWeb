import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class BotTacticalHintDto {
  @IsString()
  @MinLength(6)
  @MaxLength(12000)
  pgn!: string;

  @IsOptional()
  @IsString()
  @IsIn(["quick", "detailed"])
  detailLevel?: "quick" | "detailed";

  @IsOptional()
  @IsString()
  @IsIn(["white", "black", "White", "Black"])
  playerColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  playerSide?: string;
}
