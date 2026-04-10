import { IsIn, IsOptional } from "class-validator";

export class GetModeStatsQueryDto {
  @IsOptional()
  @IsIn(["ranked", "room", "bot", "tournament"])
  mode?: "ranked" | "room" | "bot" | "tournament";
}
