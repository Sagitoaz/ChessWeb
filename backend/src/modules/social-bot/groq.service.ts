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
      this.groq = null;
      this.modelCandidates = [];
      return;
    }

    this.groq = new Groq({
      apiKey: env.groqApiKey,
    });
    this.modelCandidates = this.buildModelCandidates();
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

  async analyzeMoveWithAI(
    fen: string,
    userMove: string,
    stockfishBestMove: string,
    score: number,
  ): Promise<string> {
    if (!this.groq) {
      return this.fallback;
    }

    const prompt = [
      "Bạn là Đại kiện tướng cờ vua và huấn luyện viên chiến thuật.",
      "Nhiệm vụ: phân tích vì sao nước đi của người chơi có vấn đề và vì sao nước đi Stockfish tốt hơn về mặt chiến thuật.",
      "BẮT BUỘC trả lời bằng TIẾNG VIỆT CÓ DẤU, ngắn gọn, rõ ràng, tối đa 7 câu.",
      "Bắt buộc có 4 phần với nhãn đề đúng nguyên văn:",
      "1) Nhận xét: đánh giá nhanh nước đi của người chơi (Tốt/Lỗi/Sai lầm nghiêm trọng).",
      "2) Vì sao nước đó chưa tốt: nêu rõ ý tưởng chiến thuật bị bỏ lỡ (ví dụ: mất kiểm soát trung tâm, lộ vua, yếu cột...).",
      "3) Gợi ý cải thiện: đề xuất hướng chơi tổng quát và điều cần ưu tiên ở nước tiếp theo, KHÔNG đưa nước đi cụ thể.",
      "4) Nước tốt hơn từ Stockfish: bắt buộc nêu lại CHÍNH XÁC nước Stockfish được cung cấp ở dưới và giải thích ngắn vì sao nó tốt hơn.",
      "Không viết mã code, không trả lời ngoài chủ đề.",
      `FEN: ${fen}`,
      `Nước đi người chơi: ${userMove}`,
      `Nước đi tốt nhất Stockfish: ${stockfishBestMove}`,
      `Điểm số đánh giá (cp): ${score}`,
    ].join("\n");

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
        const text = await this.generateWithModel(model, prompt, 260, 0.45);
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
  ): Promise<string> {
    if (!this.groq) {
      return this.coachFallback;
    }

    const sanitizedPgn = String(pgn || "").trim();
    if (!sanitizedPgn) {
      return this.coachFallback;
    }

    const isDetailed = detailLevel === "detailed";

    const prompt = [
      "Bạn đóng vai Gia sư cờ vua giàu kinh nghiệm.",
      "Đầu vào là lịch sử ván đấu (PGN).",
      "BẮT BUỘC trả lời bằng tiếng Việt CÓ DẤU.",
      "Không được tiết lộ nước đi cụ thể, không được viết dạng tọa độ (ví dụ: e4, Nf3).",
      "Chỉ đưa định hướng chiến thuật tổng quát, dễ áp dụng ngay.",
      isDetailed
        ? "Mức chi tiết: CHI TIẾT. Trả lời 6-10 câu, rõ ràng, có lưu ý rủi ro."
        : "Mức chi tiết: NHANH. Trả lời 3-4 câu súc tích.",
      "Định dạng bắt buộc:",
      "1) Nhận xét tổng quan: ...",
      "2) Điểm mạnh nên duy trì: ...",
      "3) Lưu ý chiến thuật quan trọng: ...",
      "4) Kế hoạch 2-3 lượt tới (ý tưởng): ...",
      "5) Cạm bẫy cần tránh: ...",
      "Ưu tiên các chủ đề: kiểm soát trung tâm, an toàn vua, phối hợp quân, cột mở, ô yếu, quân treo.",
      `PGN: ${sanitizedPgn}`,
    ].join("\n");

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
          isDetailed ? 420 : 220,
          0.35,
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
