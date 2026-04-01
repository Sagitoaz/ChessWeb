import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  confirmNewPassword!: string
}
