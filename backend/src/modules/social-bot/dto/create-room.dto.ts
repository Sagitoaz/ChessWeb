import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  IsEnum,
} from "class-validator";

export enum RoomTimeControl {
  Blitz = "blitz",
  Rapid = "rapid",
  Classical = "classical",
}
export class CreateRoomDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: String;

  @IsOptional()
  @IsEnum(RoomTimeControl)
  timeControl?: RoomTimeControl;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(7200)
  initialTimeSeconds?: number;
}
