import * as assert from 'assert'
import 'reflect-metadata'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { GetGamesQueryDto } from '../dto/get-games.query.dto'
import { GetLeaderboardQueryDto } from '../dto/get-leaderboard.query.dto'
import { ProfileController } from '../profile.controller'
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard'
import { ROLES_KEY } from '../../../shared/auth/roles.decorator'
import { Role } from '../../../shared/auth/roles.enum'
import { RolesGuard } from '../../../shared/auth/roles.guard'

const expectBadRequest = async (promise: Promise<unknown>): Promise<void> => {
  let thrown: unknown = null
  try {
    await promise
  } catch (error) {
    thrown = error
  }

  assert.equal(thrown instanceof BadRequestException, true)
}

async function run(): Promise<void> {
  const getGamesHandler = ProfileController.prototype.getGames as unknown as Function
  const guards = Reflect.getMetadata(GUARDS_METADATA, getGamesHandler) as unknown[]
  assert.equal(Array.isArray(guards), true)
  assert.equal(guards.length, 2)
  assert.equal(guards[0], JwtAuthGuard)
  assert.equal(guards[1], RolesGuard)

  const roles = Reflect.getMetadata(ROLES_KEY, getGamesHandler) as Role[]
  assert.deepEqual(roles, [Role.USER, Role.MOD, Role.ADMIN])

  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  })

  const validLeaderboard = (await validationPipe.transform(
    { page: '2', pageSize: '10', mode: 'ranked', sort: 'peak_desc' },
    { type: 'query', metatype: GetLeaderboardQueryDto, data: '' }
  )) as GetLeaderboardQueryDto
  assert.equal(validLeaderboard.page, 2)
  assert.equal(validLeaderboard.pageSize, 10)
  assert.equal(validLeaderboard.mode, 'ranked')
  assert.equal(validLeaderboard.sort, 'peak_desc')

  await expectBadRequest(
    validationPipe.transform(
      { page: '1', pageSize: '20', mode: 'unsupported-mode', sort: 'rating_desc' },
      { type: 'query', metatype: GetLeaderboardQueryDto, data: '' }
    )
  )

  const validGames = (await validationPipe.transform(
    {
      page: '1',
      pageSize: '20',
      mode: 'bot',
      result: 'draw',
      fromDate: '2026-03-01T00:00:00.000Z',
      toDate: '2026-03-02T00:00:00.000Z',
    },
    { type: 'query', metatype: GetGamesQueryDto, data: '' }
  )) as GetGamesQueryDto

  assert.equal(validGames.page, 1)
  assert.equal(validGames.pageSize, 20)
  assert.equal(validGames.mode, 'bot')
  assert.equal(validGames.result, 'draw')

  await expectBadRequest(
    validationPipe.transform(
      { page: '1', pageSize: '20', mode: 'ranked', result: 'resigned' },
      { type: 'query', metatype: GetGamesQueryDto, data: '' }
    )
  )

  // Direct DTO validation verifies class-validator decorators stay intact.
  const rawGamesDto = plainToInstance(GetGamesQueryDto, { result: 'unsupported' })
  const validationErrors = validateSync(rawGamesDto)
  assert.equal(validationErrors.length > 0, true)

  console.log('[unit-test] Day 3 profile controller metadata + DTO validation tests passed')
}

run().catch((error) => {
  console.error('[unit-test] Day 3 profile controller metadata + DTO validation tests failed', error)
  process.exit(1)
})
