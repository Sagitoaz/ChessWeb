import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ObjectId } from 'mongodb'
import { MongoService } from '../../shared/db/mongo.service'
import {
  CompetitionGameMode,
  CreateCompetitionGameDto,
  CreateTournamentDto,
  JoinRankedQueueDto,
  PreferredColor,
  RankedPaginationQueryDto,
  RankedTimeControl,
  TournamentQueryDto,
} from './dto/competition.dto'

interface AuthenticatedUser {
  userId: string
  roles: string[]
}

@Injectable()
export class CompetitionService {
  constructor(private readonly mongoService: MongoService) {}

  async joinQueue(user: AuthenticatedUser, payload: JoinRankedQueueDto): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const rankedQueue = db.collection('ranked_queue')

    const existingWaiting = await rankedQueue.findOne({ userId: user.userId, status: 'waiting' })
    if (existingWaiting) {
      throw new BadRequestException('Ban da o trong hang cho ranked')
    }

    const now = new Date()
    const insertResult = await rankedQueue.insertOne({
      userId: user.userId,
      status: 'waiting',
      joinedAt: now,
      updatedAt: now,
      timeControl: payload.timeControl || RankedTimeControl.BLITZ,
      preferredColor: payload.preferredColor || PreferredColor.RANDOM,
    })

    return {
      queueEntryId: insertResult.insertedId.toString(),
      userId: user.userId,
      status: 'waiting',
      joinedAt: now.toISOString(),
      timeControl: payload.timeControl || RankedTimeControl.BLITZ,
      preferredColor: payload.preferredColor || PreferredColor.RANDOM,
    }
  }

  async leaveQueue(user: AuthenticatedUser): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const rankedQueue = db.collection('ranked_queue')

    const now = new Date()
    const result = await rankedQueue.findOneAndUpdate(
      { userId: user.userId, status: 'waiting' },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new NotFoundException('Khong tim thay trang thai waiting trong hang cho')
    }

    return {
      queueEntryId: result._id?.toString?.() || null,
      userId: user.userId,
      status: result.status,
      cancelledAt: now.toISOString(),
    }
  }

  async getRankedMatchById(matchId: string): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const rankedMatches = db.collection('ranked_matches')

    const query = ObjectId.isValid(matchId) ? { _id: new ObjectId(matchId) } : { matchId }
    const match = await rankedMatches.findOne(query)

    if (!match) {
      throw new NotFoundException('Khong tim thay ranked match')
    }

    return {
      ...match,
      _id: match._id?.toString?.() || match._id,
    }
  }

  async getRankedHistory(user: AuthenticatedUser, query: RankedPaginationQueryDto): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const games = db.collection('games')

    const page = query.page || 1
    const pageSize = query.pageSize || 10
    const filter = {
      mode: CompetitionGameMode.RANKED,
      $or: [{ whitePlayerId: user.userId }, { blackPlayerId: user.userId }],
    }

    const [items, total] = await Promise.all([
      games
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      games.countDocuments(filter),
    ])

    return {
      items: items.map((item) => ({
        ...item,
        _id: item._id?.toString?.() || item._id,
      })),
      pagination: {
        page,
        pageSize,
        total,
      },
    }
  }

  async getRankedStats(user: AuthenticatedUser): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const games = db.collection('games')

    const rankedGames = await games
      .find({
        mode: CompetitionGameMode.RANKED,
        $or: [{ whitePlayerId: user.userId }, { blackPlayerId: user.userId }],
      })
      .project({ whitePlayerId: 1, blackPlayerId: 1, result: 1 })
      .toArray()

    let wins = 0
    let losses = 0
    let draws = 0

    for (const game of rankedGames) {
      const result = typeof game.result === 'string' ? game.result.toLowerCase() : ''
      const isWhite = game.whitePlayerId === user.userId
      const isBlack = game.blackPlayerId === user.userId

      if (result === 'draw' || result === '1/2-1/2') {
        draws += 1
      } else if ((isWhite && ['1-0', 'white_win', 'white'].includes(result)) || (isBlack && ['0-1', 'black_win', 'black'].includes(result))) {
        wins += 1
      } else if ((isWhite && ['0-1', 'black_win', 'black'].includes(result)) || (isBlack && ['1-0', 'white_win', 'white'].includes(result))) {
        losses += 1
      }
    }

    const totalGames = rankedGames.length
    const winRate = totalGames === 0 ? 0 : Number(((wins / totalGames) * 100).toFixed(2))

    return {
      userId: user.userId,
      totalGames,
      wins,
      losses,
      draws,
      winRate,
    }
  }

  async getTournaments(query: TournamentQueryDto): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const tournaments = db.collection('tournaments')

    const page = query.page || 1
    const pageSize = query.pageSize || 10
    const filter: Record<string, unknown> = {}
    if (query.status) {
      filter.status = query.status
    }

    const [items, total] = await Promise.all([
      tournaments
        .find(filter)
        .sort({ startAt: 1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      tournaments.countDocuments(filter),
    ])

    return {
      items: items.map((item) => ({
        ...item,
        _id: item._id?.toString?.() || item._id,
      })),
      pagination: {
        page,
        pageSize,
        total,
      },
    }
  }

  async createTournament(user: AuthenticatedUser, payload: CreateTournamentDto): Promise<Record<string, unknown>> {
    const startAt = new Date(payload.startAt)
    const endAt = new Date(payload.endAt)

    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException('startAt phai nho hon endAt')
    }

    const db = this.mongoService.getDb()
    const tournaments = db.collection('tournaments')

    const now = new Date()
    const document = {
      name: payload.name,
      format: payload.format,
      startAt,
      endAt,
      maxParticipants: payload.maxParticipants,
      createdBy: user.userId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }

    const result = await tournaments.insertOne(document)

    return {
      id: result.insertedId.toString(),
      ...document,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  }

  async getTournamentById(tournamentId: string): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb()
    const tournaments = db.collection('tournaments')

    const query = ObjectId.isValid(tournamentId) ? { _id: new ObjectId(tournamentId) } : { tournamentId }
    const tournament = await tournaments.findOne(query)

    if (!tournament) {
      throw new NotFoundException('Khong tim thay tournament')
    }

    return {
      ...tournament,
      _id: tournament._id?.toString?.() || tournament._id,
    }
  }

  async createGame(user: AuthenticatedUser, payload: CreateCompetitionGameDto): Promise<Record<string, unknown>> {
    if (payload.mode === CompetitionGameMode.TOURNAMENT && !payload.tournamentId) {
      throw new BadRequestException('tournamentId la bat buoc voi mode tournament')
    }

    const db = this.mongoService.getDb()
    const games = db.collection('games')

    const now = new Date()
    const game = {
      mode: payload.mode,
      whitePlayerId: user.userId,
      blackPlayerId: payload.opponentId,
      tournamentId: payload.tournamentId || null,
      initialFen: payload.initialFen || null,
      status: 'pending',
      result: null,
      createdAt: now,
      updatedAt: now,
    }

    const insertResult = await games.insertOne(game)

    return {
      id: insertResult.insertedId.toString(),
      ...game,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  }

  extractUser(principal: Record<string, unknown> | undefined): AuthenticatedUser {
    const userIdCandidate = principal?.sub || principal?.userId || principal?.id
    if (typeof userIdCandidate !== 'string' || !userIdCandidate.trim()) {
      throw new BadRequestException('Token khong chua user id hop le')
    }

    const rolesFromToken = Array.isArray(principal?.roles)
      ? (principal?.roles.filter((role): role is string => typeof role === 'string') as string[])
      : []

    return {
      userId: userIdCandidate,
      roles: rolesFromToken,
    }
  }
}
