import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator'

export class UploadAvatarDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  avatarUrl!: string

  @IsString()
  @IsOptional()
  @MaxLength(128)
  avatarPublicId?: string

  @IsString()
  @IsOptional()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType?: string

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(2 * 1024 * 1024)
  fileSize?: number
}
