import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

export class GetLeaderboardQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number

  @IsIn(['ranked', 'room', 'bot', 'tournament'])
  @IsOptional()
  mode?: 'ranked' | 'room' | 'bot' | 'tournament'

  @IsIn(['rating_desc', 'rating_asc', 'peak_desc', 'peak_asc'])
  @IsOptional()
  sort?: 'rating_desc' | 'rating_asc' | 'peak_desc' | 'peak_asc'
}
