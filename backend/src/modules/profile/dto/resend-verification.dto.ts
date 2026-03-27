import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class ResendVerificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  userId!: string
}
