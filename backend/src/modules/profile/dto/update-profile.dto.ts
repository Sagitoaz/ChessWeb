import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsNotEmpty()
  displayName?: string
}
