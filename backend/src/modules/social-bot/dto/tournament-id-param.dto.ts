import { IsString, MaxLength } from "class-validator";

export class TournamentIdParamDto {
  @IsString()
  @MaxLength(50)
  id!: string;
}
