import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export enum TournamentWinnerSlot {
  PLAYER1 = "player1",
  PLAYER2 = "player2",
}

export class UpdateTournamentMatchResultDto {
  @IsEnum(TournamentWinnerSlot)
  winnerSlot!: TournamentWinnerSlot;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}