import { Injectable, Logger } from '@nestjs/common'
import { env } from '../../shared/config/env'

export interface StockfishMoveResult {
  bestMoveUci: string
  evaluation: number | null
}

interface StockfishApiResponse {
  bestMoveUci?: unknown
  evaluation?: unknown
}

@Injectable()
export class StockfishService {
  private readonly logger = new Logger(StockfishService.name)

  private isConfigured(): boolean {
    return env.stockfishEnabled && Boolean(env.stockfishApiUrl)
  }

  async getBestMove(fen: string): Promise<StockfishMoveResult | null> {
    if (!this.isConfigured()) {
      return null
    }

    try {
      const response = await fetch(env.stockfishApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.stockfishApiKey ? { Authorization: `Bearer ${env.stockfishApiKey}` } : {}),
        },
        body: JSON.stringify({ fen }),
        signal: AbortSignal.timeout(env.stockfishTimeoutMs),
      })

      if (!response.ok) {
        this.logger.warn(`Stockfish API returned non-OK status: ${response.status}`)
        return null
      }

      const payload = (await response.json()) as StockfishApiResponse
      const bestMoveUci = typeof payload.bestMoveUci === 'string' ? payload.bestMoveUci.trim() : ''
      const evaluation = typeof payload.evaluation === 'number' ? payload.evaluation : null

      if (!bestMoveUci) {
        this.logger.warn('Stockfish API response missing bestMoveUci')
        return null
      }

      return {
        bestMoveUci,
        evaluation,
      }
    } catch (error) {
      this.logger.warn(`Failed to call Stockfish API: ${(error as Error).message}`)
      return null
    }
  }
}
