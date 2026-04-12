import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export enum RankedTimeControl {
  BLITZ = "blitz",
  RAPID = "rapid",
  CLASSICAL = "classical",
}

export enum PreferredColor {
  WHITE = "white",
  BLACK = "black",
  RANDOM = "random",
}

export class JoinRankedQueueDto {
  @IsOptional()
  @IsEnum(RankedTimeControl)
  timeControl?: RankedTimeControl;

  @IsOptional()
  @IsEnum(PreferredColor)
  preferredColor?: PreferredColor;
}

export enum RankedMatchCompletionResult {
  WHITE_WIN = "WhiteWin",
  BLACK_WIN = "BlackWin",
  DRAW = "Draw",
}

export class CompleteRankedMatchDto {
  @IsEnum(RankedMatchCompletionResult)
  result!: RankedMatchCompletionResult;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string;

  @IsOptional()
  @IsArray()
  moves?: Array<Record<string, unknown>>;
}

export class RankedPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}

export enum TournamentStatus {
  DRAFT = "draft",
  OPEN = "open",
  REGISTRATION = "registration",
  FULL = "full",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export class TournamentQueryDto extends RankedPaginationQueryDto {
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;
}

export enum TournamentFormat {
  SWISS = "swiss",
  ROUND_ROBIN = "round_robin",
  KNOCKOUT = "knockout",
}

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  prize?: string;

  @IsEnum(TournamentFormat)
  format!: TournamentFormat;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  timeControl?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(4096)
  maxParticipants!: number;
}

export enum CompetitionGameMode {
  RANKED = "ranked",
  TOURNAMENT = "tournament",
}

export class CreateCompetitionGameDto {
  @IsEnum(CompetitionGameMode)
  mode!: CompetitionGameMode;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  opponentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  tournamentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  initialFen?: string;
}
