import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";
import { appendFileSync } from "fs";
import { env } from "../../shared/config/env";

export interface StockfishMoveResult {
  bestMoveUci: string;
  evaluation: number | null;
}

@Injectable()
export class StockfishService {
  private readonly logger = new Logger(StockfishService.name);
  private readonly stockfishPath =
    env.stockfishBinaryPath || "/usr/bin/stockfish";
  private readonly logEnabled = env.stockfishLogEnabled;
  private readonly logFilePath = env.stockfishLogFile;

  async getBestMove(
    fen: string,
    difficulty: string = "intermediate",
  ): Promise<StockfishMoveResult | null> {
    try {
      this.log(`Requesting best move difficulty=${difficulty} fen=${fen}`);
      return await this.queryStockfish(fen, difficulty);
    } catch (error) {
      this.logger.warn(
        `Failed to get Stockfish best move: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private queryStockfish(
    fen: string,
    difficulty: string,
  ): Promise<StockfishMoveResult> {
    return new Promise((resolve, reject) => {
      const depth = this.difficultyToDepth(difficulty);
      const thinkTimeMs = this.thinkTimeForDifficulty(difficulty);
      const timeoutMs = Math.max(
        this.timeoutForDifficulty(difficulty),
        thinkTimeMs + 1500,
      );
      this.log(
        `Spawning stockfish path=${this.stockfishPath} depth=${depth} thinkTimeMs=${thinkTimeMs} timeoutMs=${timeoutMs}`,
      );

      const childProcess = spawn(this.stockfishPath);
      let lineBuffer = "";
      const timeout = setTimeout(() => {
        childProcess.kill();
        reject(new Error(`Stockfish timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      let bestMove = "";
      let evaluation: number | null = null;

      childProcess.stdout!.on("data", (data) => {
        lineBuffer += data.toString();
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          this.logLine(line.trim());
          if (line.startsWith("bestmove")) {
            const match = line.match(/^bestmove\s+(\S+)/);
            if (match) {
              bestMove = match[1];
            }
          }
          if (line.includes("score cp")) {
            const match = line.match(/score\s+cp\s+(-?\d+)/);
            if (match) {
              evaluation = Math.round(Number(match[1]) / 100);
            }
          }
        }

        if (bestMove) {
          clearTimeout(timeout);
          childProcess.kill();
          this.log(
            `Stockfish response bestMove=${bestMove} evaluation=${evaluation}`,
          );
          resolve({
            bestMoveUci: bestMove,
            evaluation,
          });
        }
      });

      childProcess.stderr!.on("data", (data) => {
        this.log(`stderr=${data.toString().trim()}`);
      });

      childProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Stockfish: ${error.message}`));
      });

      childProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          this.logger.warn(`Stockfish exited with code ${code}`);
        }
      });

      childProcess.stdin!.write("uci\n");
      childProcess.stdin!.write("isready\n");
      childProcess.stdin!.write(`position fen ${fen}\n`);
      childProcess.stdin!.write(`go movetime ${thinkTimeMs}\n`);
    });
  }

  private log(message: string): void {
    if (!this.logEnabled) {
      return;
    }
    const text = `[stockfish] ${message}`;
    this.logger.log(text);
    this.writeLogFile(text);
  }

  private logLine(line: string): void {
    if (!this.logEnabled || !line) {
      return;
    }
    if (
      line.startsWith("bestmove") ||
      line.includes("score cp") ||
      line.startsWith("uciok") ||
      line.startsWith("readyok")
    ) {
      const text = `[stockfish] ${line}`;
      this.logger.log(text);
      this.writeLogFile(text);
    }
  }

  private writeLogFile(message: string): void {
    try {
      const timestamp = new Date().toISOString();
      appendFileSync(this.logFilePath, `${timestamp} ${message}\n`, "utf8");
    } catch (error) {
      this.logger.warn(
        `Cannot write stockfish log file ${this.logFilePath}: ${(error as Error).message}`,
      );
    }
  }

  private difficultyToDepth(difficulty: string): number {
    const depthMap: { [key: string]: number } = {
      beginner: 8,
      intermediate: 15,
      advanced: 20,
      expert: 25,
    };
    return depthMap[difficulty.toLowerCase()] || 15;
  }

  private timeoutForDifficulty(difficulty: string): number {
    const base = env.stockfishTimeoutMs;
    const value = (difficulty || "").toLowerCase();

    if (value === "expert") return Math.max(base, 5000);
    if (value === "advanced") return Math.max(base, 4000);
    if (value === "intermediate") return Math.max(base, 3000);
    return base;
  }

  private thinkTimeForDifficulty(difficulty: string): number {
    const value = (difficulty || "").toLowerCase();

    if (value === "expert") return 2500;
    if (value === "advanced") return 1600;
    if (value === "intermediate") return 900;
    return 450;
  }
}
