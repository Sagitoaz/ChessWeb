import { IsInt, IsOptional, Max, Min } from "class-validator";

export class TournamentOpenRoundDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  roundIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  checkInMinutes?: number;
}
