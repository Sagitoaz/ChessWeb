import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

export class TournamentPairingDto {
  @IsString()
  player1UserId!: string;

  @IsOptional()
  @IsString()
  player2UserId?: string;
}

export class TournamentSeedingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TournamentPairingDto)
  pairs!: TournamentPairingDto[];
}
