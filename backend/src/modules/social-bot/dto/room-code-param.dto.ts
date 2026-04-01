import { IsAlphanumeric, Length } from "class-validator";

export class RoomCodeParamDto {
  @IsAlphanumeric()
  @Length(6, 6)
  code!: string;
}
