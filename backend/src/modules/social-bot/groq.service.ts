import { Injectable } from "@nestjs/common";
import Groq from "groq-sdk";
import { env } from "../../shared/config/env";

@Injectable()
export class GroqService {
  private readonly fallback = "AI đang bận, vui lòng phân tích lại sau";
  private readonly coachFallback =
    "Gia sư tạm thời bận, hãy ưu tiên kiểm soát trung tâm và giữ an toàn vua.";
  private readonly groq: Groq | null;
  private readonly modelCandidates: string[];
  private activeModelName: string | null = null;
  private lastErrorLogAt = 0;

  constructor() {
    if (!env.groqApiKey) {
      console.warn(
        "[GroqService] GROQ_API_KEY is missing; bot AI features will use fallback responses.",
      );
      this.groq = null;
      this.modelCandidates = [];
      return;
    }

    this.groq = new Groq({
      apiKey: env.groqApiKey,
    });
    this.modelCandidates = this.buildModelCandidates();
    console.log(
      `[GroqService] Groq enabled with model candidates: ${this.modelCandidates.join(", ")}`,
    );
  }

  private buildModelCandidates(): string[] {
    const preferred = [
      env.groqModel,
      "mixtral-8x7b-32768",
      "llama-3.1-70b-versatile",
      "llama-2-70b-chat",
    ]
      .map((model) => model.trim())
      .filter((model) => model.length > 0);

    return [...new Set(preferred)];
  }

  private isModelNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const status = Number((error as { status?: unknown }).status);
    if (status === 404) {
      return true;
    }

    const message = String(
      (error as { message?: unknown }).message || "",
    ).toLowerCase();
    return message.includes("not found") || message.includes("model not found");
  }

  private logFailure(message: string): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt > 30_000) {
      console.warn(`[GroqService] analyzeMoveWithAI failed: ${message}`);
      this.lastErrorLogAt = now;
    }
  }

  private extractSideToMove(fen: string): "white" | "black" | null {
    const token = String(fen || "")
      .trim()
      .split(/\s+/)[1];
    if (token === "w") return "white";
    if (token === "b") return "black";
    return null;
  }

  private mapScoreBand(score: number): string {
    if (score >= 200) return "rất tốt cho người chơi";
    if (score >= 80) return "hơi tốt cho người chơi";
    if (score > -80) return "cân bằng";
    if (score > -200) return "hơi bất lợi cho người chơi";
    return "rất bất lợi cho người chơi";
  }

  async analyzeMoveWithAI(
    fen: string,
    userMove: string,
    stockfishBestMove: string,
    score: number,
    playerColor: string = "white",
  ): Promise<string> {
    if (!this.groq) {
      return this.fallback;
    }

    const perspectiveLabel = playerColor === "black" ? "Đen" : "Trắng";
    const sideToMove = this.extractSideToMove(fen);
    const numericScore = Number.isFinite(score) ? score : 0;
    const playerPerspectiveScore =
      sideToMove && sideToMove !== playerColor ? -numericScore : numericScore;
    const scoreBand = this.mapScoreBand(playerPerspectiveScore);

    const prompt = `Bạn là đại kiện tướng cờ vua.
Phân tích từ góc nhìn bên ${perspectiveLabel} vừa đi quân.
FEN hiện tại là sau nước đi của người chơi; lượt tiếp theo thuộc về đối thủ.
Mục tiêu: chỉ ra đúng sai chiến thuật, rủi ro tức thời, và kế hoạch sửa trong 2-3 nước kế tiếp.
BẮT BUỘC trả lời tiếng Việt có dấu, ngắn gọn, thực dụng, tối đa 5 dòng.
Mỗi dòng bắt đầu đúng một nhãn dưới đây (không thêm nhãn khác):
1) Tổng quan:
2) Lỗi chính:
3) Kế hoạch 2-3 nước:
4) Nước gợi ý:
5) Cần tránh:
Yêu cầu chất lượng:
- Không nói chung chung; phải nêu đúng ý tưởng chiến thuật/cấu trúc quân.
- Ưu tiên lời khuyên có thể áp dụng ngay ở ván này.
- Nếu nước đi vẫn ổn, ghi rõ điểm tốt trước rồi mới nêu cải thiện nhỏ.
FEN: ${fen}
Nước đi người chơi: ${userMove}
Nước đi tốt nhất Stockfish: ${stockfishBestMove}
Điểm số thô (cp): ${numericScore}
Điểm số theo góc nhìn người chơi (cp): ${playerPerspectiveScore}
Mức đánh giá nhanh: ${scoreBand}`;

    const candidates = this.activeModelName
      ? [
          this.activeModelName,
          ...this.modelCandidates.filter(
            (model) => model !== this.activeModelName,
          ),
        ]
      : this.modelCandidates;

    let lastErrorMessage = this.fallback;

    for (const model of candidates) {
      try {
        const text = await this.generateWithModel(model, prompt, 340, 0.25);
        this.activeModelName = model;
        return text || this.fallback;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        lastErrorMessage = reason;

        if (!this.isModelNotFoundError(error)) {
          break;
        }

        this.logFailure(`model ${model} not found, trying next candidate`);
      }
    }

    this.logFailure(lastErrorMessage);
    return this.fallback;
  }

  async getTacticalCoachHint(
    pgn: string,
    detailLevel: "quick" | "detailed" = "detailed",
    stockfishBestMove?: string,
  ): Promise<string> {
    if (!this.groq) {
      return stockfishBestMove && stockfishBestMove !== "N/A"
        ? `Nước hay nhất theo Stockfish: ${stockfishBestMove}. Ưu tiên giữ vua an toàn, kiểm soát trung tâm và tránh treo quân.`
        : this.coachFallback;
    }

    const sanitizedPgn = String(pgn || "").trim();
    if (!sanitizedPgn) {
      return this.coachFallback;
    }

    const isDetailed = detailLevel === "detailed";
    const hintLength = isDetailed ? "4-6 câu" : "2-4 câu";
    const stockfishLine =
      stockfishBestMove && stockfishBestMove !== "N/A"
        ? `Nếu có Stockfish, nhắc ngắn gọn nước hay nhất là ${stockfishBestMove}.`
        : "";

    const prompt = `Bạn là gia sư cờ vua.
Đầu vào là PGN của ván đấu.
BẮT BUỘC trả lời bằng tiếng Việt có dấu, ngắn gọn, không lan man.
Không nêu nước đi cụ thể theo tọa độ nếu không cần thiết.
Độ dài: ${hintLength}.
${stockfishLine}
Tập trung vào: trung tâm, an toàn vua, quân treo, cột mở, ô yếu, và ý tưởng chiến thuật ngắn gọn.
PGN: ${sanitizedPgn}`;

    const candidates = this.activeModelName
      ? [
          this.activeModelName,
          ...this.modelCandidates.filter(
            (model) => model !== this.activeModelName,
          ),
        ]
      : this.modelCandidates;

    let lastErrorMessage = this.coachFallback;

    for (const model of candidates) {
      try {
        const text = await this.generateWithModel(
          model,
          prompt,
          isDetailed ? 260 : 160,
          0.25,
        );
        this.activeModelName = model;
        return text || this.coachFallback;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        lastErrorMessage = reason;

        if (!this.isModelNotFoundError(error)) {
          break;
        }

        this.logFailure(`model ${model} not found, trying next candidate`);
      }
    }

    this.logFailure(lastErrorMessage);
    return this.coachFallback;
  }

  private async generateWithModel(
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number,
  ): Promise<string> {
    const response = await this.groq!.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return String(response.choices[0]?.message?.content || "").trim();
  }
}
