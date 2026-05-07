import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { env } from '../config/env'
import { COLLECTIONS } from '../db/collections'
import { MongoService } from '../db/mongo.service'

interface AccessTokenPayload {
  sub?: unknown
  sid?: unknown
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mongoService: MongoService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>()
    const authHeader = request.headers.authorization || request.headers.Authorization
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.substring(7)
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, { secret: env.jwtAccessSecret })
      const userId = typeof payload?.sub === 'string' ? payload.sub : null
      const sessionId = typeof payload?.sid === 'string' ? payload.sid : null
      if (!userId || !sessionId) {
        throw new UnauthorizedException('Invalid or expired access token')
      }

      const db = await this.mongoService.connect()
      const activeSession = await db.collection(COLLECTIONS.AUTH_SESSIONS).findOne({
        userId,
        sessionId,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })

      if (!activeSession) {
        throw new UnauthorizedException('Session da dang xuat hoac da het han')
      }

      request.user = payload
      return true
    } catch (_error) {
      if (_error instanceof UnauthorizedException) {
        throw _error
      }
      throw new UnauthorizedException('Invalid or expired access token')
    }
  }
}
