import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";
import { appendFileSync } from "fs";
import { env } from "../../shared/config/env";

export interface StockfishMoveResult {
  bestMoveUci: string;
  evaluation: number | null;
}

interface DifficultyProfile {
  normalizedDifficulty: "easy" | "normal" | "hard" | "super_hard";
  skillLevel: number;
  limitStrength: boolean;
  targetElo: number | null;
  depth: number;
  moveTimeMs: number;
  timeoutMs: number;
  searchMode: "movetime" | "depth";
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
      const profile = this.getDifficultyProfile(difficulty);
      const timeoutMs = Math.max(profile.timeoutMs, profile.moveTimeMs + 2000);
      this.log(
        `Spawning stockfish path=${this.stockfishPath} difficulty=${profile.normalizedDifficulty} depth=${profile.depth} thinkTimeMs=${profile.moveTimeMs} timeoutMs=${timeoutMs}`,
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
          if (line.includes("score mate")) {
            const match = line.match(/score\s+mate\s+(-?\d+)/);
            if (match) {
              const mateScore = Number(match[1]);
              evaluation = mateScore > 0 ? 1000 : -1000;
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
      childProcess.stdin!.write(
        `setoption name Skill Level value ${profile.skillLevel}\n`,
      );
      childProcess.stdin!.write(
        `setoption name UCI_LimitStrength value ${profile.limitStrength ? "true" : "false"}\n`,
      );
      if (profile.limitStrength && profile.targetElo) {
        childProcess.stdin!.write(
          `setoption name UCI_Elo value ${profile.targetElo}\n`,
        );
      }
      childProcess.stdin!.write("isready\n");
      childProcess.stdin!.write(`position fen ${fen}\n`);
      if (profile.searchMode === "depth") {
        childProcess.stdin!.write(`go depth ${profile.depth}\n`);
      } else {
        childProcess.stdin!.write(`go movetime ${profile.moveTimeMs}\n`);
      }
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

  private normalizeDifficulty(
    difficulty: string,
  ): DifficultyProfile["normalizedDifficulty"] {
    const value = (difficulty || "").trim().toLowerCase();

    if (value === "easy" || value === "beginner") return "easy";
    if (value === "normal" || value === "intermediate") return "normal";
    if (value === "hard" || value === "advanced") return "hard";
    if (
      value === "super_hard" ||
      value === "superhard" ||
      value === "expert"
    ) {
      return "super_hard";
    }

    return "normal";
  }

  private getDifficultyProfile(difficulty: string): DifficultyProfile {
    const normalizedDifficulty = this.normalizeDifficulty(difficulty);
    const baseTimeout = env.stockfishTimeoutMs;

    if (normalizedDifficulty === "easy") {
      return {
        normalizedDifficulty,
        skillLevel: 2,
        limitStrength: true,
        targetElo: 700,
        depth: 8,
        moveTimeMs: 250,
        timeoutMs: Math.max(baseTimeout, 2500),
        searchMode: "movetime",
      };
    }

    if (normalizedDifficulty === "hard") {
      return {
        normalizedDifficulty,
        skillLevel: 15,
        limitStrength: true,
        targetElo: 1850,
        depth: 20,
        moveTimeMs: 1800,
        timeoutMs: Math.max(baseTimeout, 6000),
        searchMode: "movetime",
      };
    }

    if (normalizedDifficulty === "super_hard") {
      return {
        normalizedDifficulty,
        skillLevel: 20,
        limitStrength: false,
        targetElo: null,
        depth: 40,
        moveTimeMs: 15000,
        timeoutMs: Math.max(baseTimeout, 35000),
        searchMode: "depth",
      };
    }

    return {
      normalizedDifficulty: "normal",
      skillLevel: 8,
      limitStrength: true,
      targetElo: 1250,
      depth: 14,
      moveTimeMs: 800,
      timeoutMs: Math.max(baseTimeout, 4500),
      searchMode: "movetime",
    };
  }
}
