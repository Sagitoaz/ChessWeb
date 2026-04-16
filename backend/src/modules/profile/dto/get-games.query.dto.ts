import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

export const GAME_RESULT_VALUES = ['win', 'lose', 'draw'] as const
export type GameResult = (typeof GAME_RESULT_VALUES)[number]

export class GetGamesQueryDto {
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

  @IsIn(GAME_RESULT_VALUES)
  @IsOptional()
  result?: GameResult

  @IsDateString()
  @IsOptional()
  fromDate?: string

  @IsDateString()
  @IsOptional()
  toDate?: string
}
