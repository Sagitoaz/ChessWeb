import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class SaveBotGameDto {
  @IsIn(["WhiteWin", "BlackWin", "Draw"])
  result!: "WhiteWin" | "BlackWin" | "Draw";

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  endReason?: string;

  @IsOptional()
  @IsString()
  initialFEN?: string;

  @IsOptional()
  @IsArray()
  moves?: Array<Record<string, unknown>>;

  @IsOptional()
  whitePlayer?: Record<string, unknown>;

  @IsOptional()
  blackPlayer?: Record<string, unknown>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
