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

    const prompt = `Bạn là HLV cờ vua trình độ đại kiện tướng, chuyên phân tích sau từng nước đi.
Ngữ cảnh:
- Người chơi vừa đi quân bên ${perspectiveLabel}.
- FEN là vị trí SAU nước đi của người chơi, đến lượt đối thủ.
- Điểm số theo góc nhìn người chơi: ${playerPerspectiveScore} cp (${scoreBand}).

Nhiệm vụ:
1) Đánh giá nước vừa đi có đúng ý tưởng hay sai ý tưởng chiến thuật.
2) Chỉ ra rủi ro khẩn cấp nhất trong 1-2 nước tới (nếu có).
3) Đưa kế hoạch thực chiến 2-3 nước cho người chơi, ưu tiên tính an toàn của vua và quân treo.
4) So sánh nhanh với nước tốt nhất của Stockfish.

Định dạng bắt buộc:
- Trả lời TIẾNG VIỆT có dấu.
- ĐÚNG 5 dòng, không thêm dòng.
- Mỗi dòng bắt đầu chính xác một nhãn sau:
1) Tổng quan:
2) Điểm mạnh/yếu:
3) Rủi ro ngay:
4) Kế hoạch 2-3 nước:
5) Nước ứng viên:

Ràng buộc chất lượng:
- Tuyệt đối tránh câu chung chung kiểu "cải thiện vị trí".
- Nêu motif cụ thể khi có thể: ghim, xiên, đôi, quá tải, đòn đổi quân có lợi, lộ vua, ô yếu.
- Nếu userMove gần tối ưu thì ghi rõ vì sao tốt, sau đó nêu cải thiện nhỏ.
- Không phán bừa khi dữ liệu chưa đủ: dùng câu "chưa thấy đòn chiến thuật tức thời" nếu phù hợp.
- Nếu có nước tốt nhất của Stockfish, dòng 5 bắt buộc phải nêu rõ đúng nước đó.
- Nếu Stockfish không có dữ liệu và giá trị là "N/A", phải ghi rõ engine chưa trả về nước ứng viên, tuyệt đối không tự bịa.

Dữ liệu:
FEN: ${fen}
Nước đi người chơi: ${userMove}
Nước đi tốt nhất Stockfish: ${stockfishBestMove}
Điểm số thô (cp): ${numericScore}
Điểm số theo góc nhìn người chơi (cp): ${playerPerspectiveScore}`;

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
    perspective?: {
      playerColor?: "white" | "black";
      playerSide?: string;
    },
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
    const hintLength = isDetailed ? "4-6 câu" : "2-3 câu";
    const normalizedColor =
      perspective?.playerColor === "black" ? "Đen" : "Trắng";
    const sideLabel = String(perspective?.playerSide || "").trim();
    const perspectiveLine = sideLabel
      ? `Người dùng đang cầm quân ${sideLabel} (${normalizedColor}).`
      : `Người dùng đang cầm quân ${normalizedColor}.`;
    const stockfishLine =
      stockfishBestMove && stockfishBestMove !== "N/A"
        ? `Có Stockfish best move: ${stockfishBestMove}. Chỉ coi đây là nước ứng viên, giải thích ý tưởng thay vì ép đi đúng nước.`
        : "";

    const prompt = `Bạn là gia sư cờ vua thực chiến, ưu tiên lời khuyên có thể áp dụng ngay trong ván.
${perspectiveLine}
Đầu vào là PGN hiện tại của ván đấu.
Yêu cầu trả lời:
- Tiếng Việt có dấu, ngắn gọn, không lan man.
- Độ dài ${hintLength}.
- Không viết kiểu lý thuyết dài dòng.
- Không liệt kê quá 1 nước đi tọa độ; thay vào đó nói ý tưởng và kế hoạch.
${stockfishLine}

Định dạng bắt buộc:
1) Ưu tiên ngay:
2) Cạm bẫy cần tránh:
3) Kế hoạch kế tiếp:

Trọng tâm đánh giá:
- An toàn vua, quân treo, nước chiếu/đòn chiến thuật 1-2 nước.
- Tranh chấp trung tâm, cột mở, ô yếu quanh vua.
- Quy đổi quân có lợi hay bất lợi trong ngắn hạn.

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
