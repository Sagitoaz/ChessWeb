import { Controller, Get, Headers } from '@nestjs/common'
import { successResponse, ApiResponse } from '../../shared/http/response.util'

@Controller('health')
export class HealthController {
  @Get()
  getHealth(@Headers('x-request-id') requestId?: string): ApiResponse<{ status: string }> {
    return successResponse({ status: 'ok' }, requestId || null)
  }
}
