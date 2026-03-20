import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { env } from '../config/env'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>()
    const authHeader = request.headers.authorization || request.headers.Authorization
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.substring(7)
    try {
      request.user = this.jwtService.verify(token, { secret: env.jwtAccessSecret })
      return true
    } catch (_error) {
      throw new UnauthorizedException('Invalid or expired access token')
    }
  }
}
