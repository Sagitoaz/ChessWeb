import { Controller, Get, Headers } from '@nestjs/common'
import { env } from '../../shared/config/env'
import { successResponse, ApiResponse } from '../../shared/http/response.util'

@Controller('health')
export class HealthController {
  @Get()
  getHealth(@Headers('x-request-id') requestId?: string): ApiResponse<{ status: string; groq: string }> {
    return successResponse(
      {
        status: 'ok',
        groq: env.groqEnabled ? 'configured' : 'missing',
      },
      requestId || null,
    )
  }
}
