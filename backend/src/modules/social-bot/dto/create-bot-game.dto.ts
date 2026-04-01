import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum BotDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
  MASTER = "master",
  GRANDMASTER = "grandmaster",
}

export class CreateBotGameDto {
  @IsEnum(BotDifficulty)
  difficulty!: BotDifficulty;

  @IsOptional()
  @IsString()
  @IsIn(["white", "black", "random"])
  preferredColor?: "white" | "black" | "random";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxThinkSeconds?: number;
}
