import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { MongoService } from "../../shared/db/mongo.service";
import {
  CompleteRankedMatchDto,
  CompetitionGameMode,
  CreateCompetitionGameDto,
  CreateTournamentDto,
  JoinRankedQueueDto,
  PreferredColor,
  RankedPaginationQueryDto,
  RankedMatchCompletionResult,
  RankedTimeControl,
  TournamentQueryDto,
} from "./dto/competition.dto";

interface AuthenticatedUser {
  userId: string;
  roles: string[];
}

interface QueueEntryDoc {
  _id: ObjectId;
  userId: string;
  status: "waiting" | "matched" | "cancelled";
  joinedAt: Date;
  updatedAt: Date;
  timeControl: RankedTimeControl;
  preferredColor: PreferredColor;
}

interface MatchPlayerInfo {
  userId: string;
  username: string;
  rating: number;
}

interface RankedMatchResult {
  matchId: string;
  timeControl: RankedTimeControl;
  white: MatchPlayerInfo;
  black: MatchPlayerInfo;
  createdAt: string;
}

interface WaitingQueueEntry {
  _id: ObjectId;
  userId: string;
  joinedAt: Date;
  timeControl: RankedTimeControl;
  preferredColor: PreferredColor;
}

type ActiveRankedMatchInfo = {
  matchId: string;
  whitePlayerId: string;
  blackPlayerId: string;
};

@Injectable()
export class CompetitionService {
  constructor(private readonly mongoService: MongoService) {
    this.initializeQueueIndexes();
  }

  private readonly logger = new Logger(CompetitionService.name);

  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  private queueCollection() {
    return this.mongoService.getDb().collection("ranked_queue");
  }

  private gamesCollection() {
    return this.mongoService.getDb().collection("games");
  }

  private matchesCollection() {
    return this.mongoService.getDb().collection("ranked_matches");
  }

  private ratingsCollection() {
    return this.mongoService.getDb().collection<{
      _id: string;
      rating?: number;
      rankedElo?: number;
      peakRating?: number;
      createdAt?: Date;
      updatedAt?: Date;
    }>("user_ratings");
  }

  private statsCollection() {
    return this.mongoService.getDb().collection<{
      userId: string;
      gamesPlayed?: number;
      totalGames?: number;
      wins?: number;
      losses?: number;
      draws?: number;
      createdAt?: Date;
      updatedAt?: Date;
    }>("user_stats");
  }

  private profilesCollection() {
    return this.mongoService.getDb().collection<{
      _id: string;
      rating?: number;
      updatedAt?: Date;
    }>("user_profiles");
  }

  private async getActiveRankedMatchForUser(
    userId: string,
  ): Promise<ActiveRankedMatchInfo | null> {
    const match = await this.matchesCollection().findOne(
      {
        $or: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: { $in: ["active", "in_progress", "playing", "matched"] },
      },
      {
        sort: { createdAt: -1, _id: -1 },
        projection: {
          _id: 1,
          matchId: 1,
          gameId: 1,
          status: 1,
          whitePlayerId: 1,
          blackPlayerId: 1,
        },
      },
    );

    if (!match) return null;

    const whitePlayerId = String(match.whitePlayerId || "");
    const blackPlayerId = String(match.blackPlayerId || "");
    if (!whitePlayerId || !blackPlayerId) return null;

    const gameRef = match.gameId ?? match.matchId ?? match._id;
    const gameQuery =
      gameRef instanceof ObjectId
        ? { _id: gameRef }
        : typeof gameRef === "string" && ObjectId.isValid(gameRef)
          ? { _id: new ObjectId(gameRef) }
          : null;

    if (gameQuery) {
      const game = await this.gamesCollection().findOne(gameQuery, {
        projection: {
          _id: 1,
          status: 1,
          state: 1,
          result: 1,
          finishedAt: 1,
          endReason: 1,
        },
      });

      const gameCompleted = Boolean(
        game?.finishedAt ||
          String(game?.status || "").toLowerCase() === "completed" ||
          String(game?.state || "").toLowerCase() === "finished" ||
          game?.result,
      );

      if (gameCompleted) {
        await this.matchesCollection().updateOne(
          { _id: match._id },
          {
            $set: {
              status: "completed",
              finishedAt: game?.finishedAt ? new Date(game.finishedAt) : new Date(),
              updatedAt: new Date(),
              endReason:
                typeof game?.endReason === "string" && game.endReason.length > 0
                  ? game.endReason
                  : "completed",
            },
          },
        );
        return null;
      }
    }

    return {
      matchId:
        typeof match.matchId === "string" && match.matchId.length > 0
          ? match.matchId
          : match._id.toString(),
      whitePlayerId,
      blackPlayerId,
    };
  }

  private initializeQueueIndexes(): void {
    void this.ensureQueueIndexes().catch((error) => {
      this.logger.warn(
        `Cannot initialize ranked queue indexes: ${(error as Error).message}`,
      );
    });
  }

  private async ensureQueueIndexes(): Promise<void> {
    const queue = this.queueCollection();

    // Best-effort cleanup to avoid unique-index creation failures caused by old duplicate rows.
    await this.cleanupDuplicateWaitingEntries();

    await Promise.all([
      queue.createIndex(
        { status: 1, timeControl: 1, joinedAt: 1, _id: 1 },
        { name: "ranked_queue_waiting_scan" },
      ),
      queue.createIndex(
        { userId: 1 },
        {
          name: "ranked_queue_unique_waiting_user",
          unique: true,
          partialFilterExpression: { status: "waiting" },
        },
      ),
    ]);
  }

  private async cleanupDuplicateWaitingEntries(): Promise<void> {
    const queue = this.queueCollection();
    const waiting = (await queue
      .find({ status: "waiting" })
      .sort({ joinedAt: 1, _id: 1 })
      .toArray()) as QueueEntryDoc[];

    if (!Array.isArray(waiting) || waiting.length < 2) {
      return;
    }

    const seenUsers = new Set<string>();
    const duplicateIds: ObjectId[] = [];

    for (const entry of waiting) {
      if (seenUsers.has(entry.userId)) {
        duplicateIds.push(entry._id);
        continue;
      }
      seenUsers.add(entry.userId);
    }

    if (duplicateIds.length === 0) {
      return;
    }

    const now = new Date();
    await queue.updateMany(
      { _id: { $in: duplicateIds }, status: "waiting" },
      {
        $set: {
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
          cancelReason: "duplicate_waiting_entry",
        },
      },
    );
  }

  private expectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  private normalizeRating(value: number): number {
    return Math.max(100, Math.round(value));
  }

  private mapCompletionResult(result: RankedMatchCompletionResult): {
    persistedResult: "1-0" | "0-1" | "draw";
    whiteScore: number;
  } {
    if (result === RankedMatchCompletionResult.WHITE_WIN) {
      return { persistedResult: "1-0", whiteScore: 1 };
    }

    if (result === RankedMatchCompletionResult.BLACK_WIN) {
      return { persistedResult: "0-1", whiteScore: 0 };
    }

    return { persistedResult: "draw", whiteScore: 0.5 };
  }

  private resolveOutcomeForUser(
    result: "1-0" | "0-1" | "draw",
    userId: string,
    whitePlayerId: string,
    blackPlayerId: string,
  ): "win" | "lose" | "draw" {
    if (result === "draw") return "draw";
    if (result === "1-0") return userId === whitePlayerId ? "win" : "lose";
    return userId === blackPlayerId ? "win" : "lose";
  }

  private normalizeEndReason(
    reason: unknown,
    result?: "1-0" | "0-1" | "draw",
  ): string {
    const value =
      typeof reason === "string" ? reason.trim().toLowerCase() : "";

    if (!value) {
      return result === "draw" ? "draw" : "completed";
    }

    if (value === "checkmate" || value === "mate") return "checkmate";
    if (value === "resignation" || value === "resign") return "resignation";
    if (
      value === "forfeit" ||
      value === "forfeit_leave" ||
      value === "forfeit_navigation" ||
      value === "disconnect_forfeit" ||
      value === "manual_forfeit" ||
      value === "no_show_forfeit"
    ) {
      return "forfeit";
    }
    if (
      value === "timeout" ||
      value === "time_out" ||
      value === "out_of_time" ||
      value === "flag"
    ) {
      return "timeout";
    }
    if (value === "stalemate") return "stalemate";
    if (
      value === "draw" ||
      value === "draw_agreement" ||
      value === "agreement_draw" ||
      value === "threefold_repetition" ||
      value === "insufficient_material" ||
      value === "fifty_move_rule" ||
      value === "1/2-1/2"
    ) {
      return "draw";
    }
    if (value === "aborted" || value === "abort") return "aborted";
    if (value === "completed" || value === "game_end") return "completed";

    return result === "draw" ? "draw" : "completed";
  }

  private async updateUserRatingAfterMatch(
    userId: string,
    nextRating: number,
    now: Date,
  ): Promise<number> {
    const current = await this.ratingsCollection().findOne(
      { _id: userId },
      { projection: { peakRating: 1 } },
    );
    const peakRating = Math.max(
      this.normalizeRating(Number(current?.peakRating ?? 1200)),
      nextRating,
    );

    await this.ratingsCollection().updateOne(
      { _id: userId },
      {
        $set: {
          rating: nextRating,
          rankedElo: nextRating,
          peakRating,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: userId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.profilesCollection().updateOne(
      { _id: userId },
      {
        $set: {
          rating: nextRating,
          updatedAt: now,
        },
      },
    );

    return peakRating;
  }

  private async updateUserStatsAfterMatch(
    userId: string,
    outcome: "win" | "lose" | "draw",
    now: Date,
  ): Promise<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  }> {
    const inc = {
      gamesPlayed: 1,
      totalGames: 1,
      wins: outcome === "win" ? 1 : 0,
      losses: outcome === "lose" ? 1 : 0,
      draws: outcome === "draw" ? 1 : 0,
    };

    await this.statsCollection().updateOne(
      { userId },
      {
        $inc: inc,
        $set: { updatedAt: now },
        $setOnInsert: {
          userId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const stats = await this.statsCollection().findOne(
      { userId },
      {
        projection: {
          gamesPlayed: 1,
          totalGames: 1,
          wins: 1,
          losses: 1,
          draws: 1,
        },
      },
    );

    return {
      gamesPlayed: Number(stats?.gamesPlayed ?? stats?.totalGames ?? 0),
      wins: Number(stats?.wins ?? 0),
      losses: Number(stats?.losses ?? 0),
      draws: Number(stats?.draws ?? 0),
    };
  }

  private async getUserRating(userId: string): Promise<number> {
    const db = this.mongoService.getDb();
    const ratingDoc = await db
      .collection<{ _id: string; rating?: number }>("user_ratings")
      .findOne({ _id: userId }, { projection: { rating: 1 } });
    if (
      typeof ratingDoc?.rating === "number" &&
      Number.isFinite(ratingDoc.rating)
    ) {
      return Math.max(100, Math.round(ratingDoc.rating));
    }

    const profileDoc = await db
      .collection<{ _id: string; rating?: number }>("user_profiles")
      .findOne({ _id: userId }, { projection: { rating: 1 } });
    if (
      typeof profileDoc?.rating === "number" &&
      Number.isFinite(profileDoc.rating)
    ) {
      return Math.max(100, Math.round(profileDoc.rating));
    }

    return 1200;
  }

  private async getUserProfile(
    userId: string,
  ): Promise<{ username: string; rating: number }> {
    const db = this.mongoService.getDb();
    const userProfiles = db.collection<{ _id: string; username?: string }>(
      "user_profiles",
    );
    const profileDoc = await userProfiles.findOne(
      { _id: userId },
      { projection: { username: 1 } },
    );
    const rating = await this.getUserRating(userId);
    return {
      username:
        typeof profileDoc?.username === "string"
          ? profileDoc.username
          : `user-${userId.slice(0, 6)}`,
      rating,
    };
  }

  private async replaceGameMoves(
    gameId: string,
    moves: Array<Record<string, unknown>>,
    now: Date,
  ): Promise<void> {
    const collection = this.mongoService.getDb().collection("game_moves");
    await collection.deleteMany({ gameId });

    if (!Array.isArray(moves) || moves.length === 0) {
      return;
    }

    await collection.bulkWrite(
      moves.map((move, index) => {
        const ply =
          typeof move?.ply === "number" && Number.isFinite(move.ply)
            ? Number(move.ply)
            : index + 1;

        return {
          insertOne: {
            document: {
              gameId,
              ply,
              san:
                typeof move?.san === "string" ? String(move.san).trim() : null,
              uci:
                typeof move?.uci === "string" ? String(move.uci).trim() : null,
              from:
                typeof move?.from === "string"
                  ? String(move.from).trim()
                  : null,
              to:
                typeof move?.to === "string" ? String(move.to).trim() : null,
              piece:
                typeof move?.piece === "string"
                  ? String(move.piece).trim()
                  : null,
              color:
                typeof move?.color === "string"
                  ? String(move.color).trim()
                  : null,
              captured:
                typeof move?.captured === "string"
                  ? String(move.captured).trim()
                  : null,
              promotion:
                typeof move?.promotion === "string"
                  ? String(move.promotion).trim()
                  : null,
              isCheck: Boolean(move?.isCheck),
              isCheckmate: Boolean(move?.isCheckmate),
              timestamp:
                typeof move?.timestamp === "string"
                  ? move.timestamp
                  : now.toISOString(),
              rawMove: move,
              createdAt: now,
              updatedAt: now,
            },
          },
        };
      }),
      { ordered: true },
    );
  }

  private isColorCompatible(a: PreferredColor, b: PreferredColor): boolean {
    if (a === PreferredColor.RANDOM || b === PreferredColor.RANDOM) return true;
    return a !== b;
  }

  private decideColors(
    first: { userId: string; preferredColor: PreferredColor },
    second: { userId: string; preferredColor: PreferredColor },
  ): { whitePlayerId: string; blackPlayerId: string } {
    if (
      first.preferredColor === PreferredColor.WHITE &&
      second.preferredColor !== PreferredColor.WHITE
    ) {
      return { whitePlayerId: first.userId, blackPlayerId: second.userId };
    }
    if (
      second.preferredColor === PreferredColor.WHITE &&
      first.preferredColor !== PreferredColor.WHITE
    ) {
      return { whitePlayerId: second.userId, blackPlayerId: first.userId };
    }
    if (
      first.preferredColor === PreferredColor.BLACK &&
      second.preferredColor !== PreferredColor.BLACK
    ) {
      return { whitePlayerId: second.userId, blackPlayerId: first.userId };
    }
    if (
      second.preferredColor === PreferredColor.BLACK &&
      first.preferredColor !== PreferredColor.BLACK
    ) {
      return { whitePlayerId: first.userId, blackPlayerId: second.userId };
    }

    return Math.random() < 0.5
      ? { whitePlayerId: first.userId, blackPlayerId: second.userId }
      : { whitePlayerId: second.userId, blackPlayerId: first.userId };
  }

  private getAllowedEloGap(waitSeconds: number): number {
    // Start strict and gradually widen to keep queue times reasonable.
    const baseGap = 80;
    const growthPer10Sec = 20;
    const widened = baseGap + Math.floor(waitSeconds / 10) * growthPer10Sec;
    return Math.min(400, widened);
  }

  private shouldRelaxColorPreference(waitSeconds: number): boolean {
    return waitSeconds >= 10;
  }

  async getWaitingQueueCount(timeControl?: RankedTimeControl): Promise<number> {
    const match: Record<string, unknown> = { status: "waiting" };
    if (timeControl) {
      match.timeControl = timeControl;
    }
    return this.queueCollection().countDocuments(match);
  }

  async getWaitingQueueUserIds(
    timeControl?: RankedTimeControl,
  ): Promise<string[]> {
    const match: Record<string, unknown> = { status: "waiting" };
    if (timeControl) {
      match.timeControl = timeControl;
    }

    const entries = (await this.queueCollection()
      .find(match, { projection: { userId: 1 } })
      .sort({ joinedAt: 1, _id: 1 })
      .toArray()) as Array<{ userId?: string }>;

    return entries
      .map((entry) => entry.userId)
      .filter(
        (userId): userId is string =>
          typeof userId === "string" && userId.length > 0,
      );
  }

  private async getWaitingQueueEntries(
    timeControl?: RankedTimeControl,
  ): Promise<WaitingQueueEntry[]> {
    const match: Record<string, unknown> = { status: "waiting" };
    if (timeControl) {
      match.timeControl = timeControl;
    }

    const entries = (await this.queueCollection()
      .find(match)
      .sort({ joinedAt: 1, _id: 1 })
      .toArray()) as WaitingQueueEntry[];

    if (!Array.isArray(entries) || entries.length < 2) {
      return entries;
    }

    const seenUsers = new Set<string>();
    const uniqueEntries: WaitingQueueEntry[] = [];
    const duplicateIds: ObjectId[] = [];
    for (const entry of entries) {
      if (seenUsers.has(entry.userId)) {
        duplicateIds.push(entry._id);
        continue;
      }
      seenUsers.add(entry.userId);
      uniqueEntries.push(entry);
    }

    if (duplicateIds.length > 0) {
      const now = new Date();
      await this.queueCollection().updateMany(
        { _id: { $in: duplicateIds }, status: "waiting" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
            cancelReason: "duplicate_waiting_entry",
          },
        },
      );
    }

    return uniqueEntries;
  }

  async joinQueue(
    user: AuthenticatedUser,
    payload: JoinRankedQueueDto,
  ): Promise<Record<string, unknown>> {
    const rankedQueue = this.queueCollection();
    const activeMatch = await this.getActiveRankedMatchForUser(user.userId);
    if (activeMatch) {
      // Ensure we do not keep stale waiting entries while user is already in a live ranked match.
      await rankedQueue.updateMany(
        { userId: user.userId, status: "waiting" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
            cancelReason: "already_in_active_ranked_match",
          },
        },
      );

      return {
        queueEntryId: null,
        userId: user.userId,
        status: "in_match",
        matchId: activeMatch.matchId,
        message: "User already has an active ranked match",
      };
    }

    // If a previous matchmaking cycle already claimed this user but has not finished creating matchId yet,
    // do not allow creating a fresh waiting row (prevents duplicate parallel matches).
    const pendingClaim = await rankedQueue.findOne({
      userId: user.userId,
      status: "matched",
      $or: [{ matchId: { $exists: false } }, { matchId: null }],
    });
    if (pendingClaim) {
      return {
        queueEntryId: pendingClaim._id?.toString?.() || null,
        userId: user.userId,
        status: "matching",
        message: "User is already being matched",
      };
    }

    const existingWaitingEntries = (await rankedQueue
      .find({
        userId: user.userId,
        status: "waiting",
      })
      .sort({ joinedAt: 1, _id: 1 })
      .toArray()) as QueueEntryDoc[];
    const existingWaiting = existingWaitingEntries[0] || null;
    if (existingWaitingEntries.length > 1) {
      const duplicateIds = existingWaitingEntries
        .slice(1)
        .map((entry) => entry._id);
      const now = new Date();
      await rankedQueue.updateMany(
        { _id: { $in: duplicateIds }, status: "waiting" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
            cancelReason: "duplicate_waiting_entry",
          },
        },
      );
    }

    if (existingWaiting) {
      return {
        queueEntryId: existingWaiting._id?.toString?.() || null,
        userId: user.userId,
        rating: await this.getUserRating(user.userId),
        status: "waiting",
        joinedAt:
          existingWaiting.joinedAt instanceof Date
            ? existingWaiting.joinedAt.toISOString()
            : new Date().toISOString(),
        timeControl:
          existingWaiting.timeControl ||
          payload.timeControl ||
          RankedTimeControl.BLITZ,
        preferredColor:
          existingWaiting.preferredColor ||
          payload.preferredColor ||
          PreferredColor.RANDOM,
      };
    }

    const userRating = await this.getUserRating(user.userId);
    const timeControl = payload.timeControl || RankedTimeControl.BLITZ;
    const preferredColor = payload.preferredColor || PreferredColor.RANDOM;

    const now = new Date();
    let insertResult: { insertedId: ObjectId };
    try {
      insertResult = await rankedQueue.insertOne({
        userId: user.userId,
        status: "waiting",
        joinedAt: now,
        updatedAt: now,
        timeControl,
        preferredColor,
        ratingSnapshot: userRating,
      });
    } catch (error: any) {
      // When concurrent join requests happen, unique waiting index may reject duplicates.
      if (error?.code === 11000) {
        const existing = (await rankedQueue.findOne({
          userId: user.userId,
          status: "waiting",
        })) as QueueEntryDoc | null;
        if (existing) {
          return {
            queueEntryId: existing._id?.toString?.() || null,
            userId: user.userId,
            rating: userRating,
            status: "waiting",
            joinedAt:
              existing.joinedAt instanceof Date
                ? existing.joinedAt.toISOString()
                : now.toISOString(),
            timeControl:
              existing.timeControl || payload.timeControl || RankedTimeControl.BLITZ,
            preferredColor:
              existing.preferredColor ||
              payload.preferredColor ||
              PreferredColor.RANDOM,
          };
        }
      }
      throw error;
    }

    return {
      queueEntryId: insertResult.insertedId.toString(),
      userId: user.userId,
      rating: userRating,
      status: "waiting",
      joinedAt: now.toISOString(),
      timeControl,
      preferredColor,
    };
  }

  async leaveQueue(user: AuthenticatedUser): Promise<Record<string, unknown>> {
    const result = await this.cancelWaitingQueueEntry(user.userId);

    if (!result) {
      return {
        queueEntryId: null,
        userId: user.userId,
        status: "not_waiting",
        cancelledAt: null,
      };
    }

    return {
      queueEntryId: result._id.toString(),
      userId: user.userId,
      status: result.status,
      cancelledAt: result.cancelledAt,
    };
  }

  async cancelWaitingQueueEntry(userId: string): Promise<{
    _id: ObjectId;
    status: "cancelled";
    cancelledAt: string;
  } | null> {
    const rankedQueue = this.queueCollection();

    const now = new Date();
    const result = await rankedQueue.findOneAndUpdate(
      { userId, status: "waiting" },
      {
        $set: {
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      return null;
    }

    return {
      _id: result._id,
      status: "cancelled",
      cancelledAt: now.toISOString(),
    };
  }

  async getRankedMatchById(matchId: string): Promise<Record<string, unknown>> {
    const rankedMatches = this.matchesCollection();

    const query = ObjectId.isValid(matchId)
      ? { _id: new ObjectId(matchId) }
      : { matchId };
    const match = await rankedMatches.findOne(query);

    if (!match) {
      throw new NotFoundException("Khong tim thay ranked match");
    }

    return {
      ...match,
      _id: match._id?.toString?.() || match._id,
    };
  }

  async completeRankedMatch(
    user: AuthenticatedUser,
    matchId: string,
    payload: CompleteRankedMatchDto,
  ): Promise<Record<string, unknown>> {
    const matchQuery = ObjectId.isValid(matchId)
      ? { $or: [{ _id: new ObjectId(matchId) }, { matchId }] }
      : { matchId };

    const match = await this.matchesCollection().findOne(matchQuery);
    if (!match) {
      throw new NotFoundException("Khong tim thay ranked match");
    }

    const whitePlayerId = String(match.whitePlayerId || "");
    const blackPlayerId = String(match.blackPlayerId || "");
    if (!whitePlayerId || !blackPlayerId) {
      throw new BadRequestException("Ranked match data khong hop le");
    }

    if (user.userId !== whitePlayerId && user.userId !== blackPlayerId) {
      throw new BadRequestException(
        "User is not a participant of this ranked match",
      );
    }

    const gameIdRaw = match.gameId || match.matchId;
    const gameQuery =
      gameIdRaw instanceof ObjectId
        ? { _id: gameIdRaw }
        : typeof gameIdRaw === "string" && ObjectId.isValid(gameIdRaw)
          ? { _id: new ObjectId(gameIdRaw) }
          : ObjectId.isValid(match.matchId)
            ? { _id: new ObjectId(match.matchId) }
            : null;

    if (!gameQuery) {
      throw new BadRequestException(
        "Khong xac dinh duoc gameId cho ranked match",
      );
    }
    const game = await this.gamesCollection().findOne(gameQuery);
    if (!game) {
      throw new NotFoundException("Khong tim thay game cua ranked match");
    }

    if (game.finishedAt || game.status === "completed" || game.result) {
      const userRating = await this.getUserRating(user.userId);
      const userStats = await this.statsCollection().findOne({
        userId: user.userId,
      });
      return {
        matchId: String(match.matchId || matchId),
        alreadyCompleted: true,
        result: game.result,
        player: {
          userId: user.userId,
          ratingAfter: userRating,
          gamesPlayed: Number(
            userStats?.gamesPlayed ?? userStats?.totalGames ?? 0,
          ),
          wins: Number(userStats?.wins ?? 0),
          losses: Number(userStats?.losses ?? 0),
          draws: Number(userStats?.draws ?? 0),
        },
      };
    }

    const whiteRatingBefore = await this.getUserRating(whitePlayerId);
    const blackRatingBefore = await this.getUserRating(blackPlayerId);
    const { persistedResult, whiteScore } = this.mapCompletionResult(
      payload.result,
    );
    const normalizedEndReason = this.normalizeEndReason(
      payload.reason,
      persistedResult,
    );

    const kFactor = 32;
    const whiteDelta = Math.round(
      kFactor *
        (whiteScore - this.expectedScore(whiteRatingBefore, blackRatingBefore)),
    );
    const blackDelta = -whiteDelta;

    const whiteRatingAfter = this.normalizeRating(
      whiteRatingBefore + whiteDelta,
    );
    const blackRatingAfter = this.normalizeRating(
      blackRatingBefore + blackDelta,
    );

    const now = new Date();

    await this.gamesCollection().updateOne(
      { _id: game._id },
      {
        $set: {
          result: persistedResult,
          status: "completed",
          state: "Finished",
          endReason: normalizedEndReason,
          moves: Array.isArray(payload.moves)
            ? payload.moves
            : game.moves || [],
          updatedAt: now,
          finishedAt: now,
        },
      },
    );

    await this.replaceGameMoves(
      String(game._id),
      Array.isArray(payload.moves)
        ? (payload.moves as Array<Record<string, unknown>>)
        : Array.isArray(game.moves)
          ? (game.moves as Array<Record<string, unknown>>)
          : [],
      now,
    );

    await this.matchesCollection().updateOne(
      { _id: match._id },
      {
        $set: {
          status: "completed",
          result: persistedResult,
          endReason: normalizedEndReason,
          finishedAt: now,
          whiteRatingBefore,
          blackRatingBefore,
          whiteRatingAfter,
          blackRatingAfter,
          updatedAt: now,
        },
      },
    );

    await Promise.all([
      this.updateUserRatingAfterMatch(whitePlayerId, whiteRatingAfter, now),
      this.updateUserRatingAfterMatch(blackPlayerId, blackRatingAfter, now),
    ]);

    const whiteOutcome = this.resolveOutcomeForUser(
      persistedResult,
      whitePlayerId,
      whitePlayerId,
      blackPlayerId,
    );
    const blackOutcome = this.resolveOutcomeForUser(
      persistedResult,
      blackPlayerId,
      whitePlayerId,
      blackPlayerId,
    );

    const [whiteStats, blackStats] = await Promise.all([
      this.updateUserStatsAfterMatch(whitePlayerId, whiteOutcome, now),
      this.updateUserStatsAfterMatch(blackPlayerId, blackOutcome, now),
    ]);

    const isWhite = user.userId === whitePlayerId;
    const playerOutcome = this.resolveOutcomeForUser(
      persistedResult,
      user.userId,
      whitePlayerId,
      blackPlayerId,
    );

    return {
      matchId: String(match.matchId || matchId),
      alreadyCompleted: false,
      result: persistedResult,
      endReason: normalizedEndReason,
      player: {
        userId: user.userId,
        outcome: playerOutcome,
        ratingBefore: isWhite ? whiteRatingBefore : blackRatingBefore,
        ratingAfter: isWhite ? whiteRatingAfter : blackRatingAfter,
        ratingDelta: isWhite ? whiteDelta : blackDelta,
        gamesPlayed: isWhite ? whiteStats.gamesPlayed : blackStats.gamesPlayed,
        wins: isWhite ? whiteStats.wins : blackStats.wins,
        losses: isWhite ? whiteStats.losses : blackStats.losses,
        draws: isWhite ? whiteStats.draws : blackStats.draws,
      },
      white: {
        userId: whitePlayerId,
        ratingBefore: whiteRatingBefore,
        ratingAfter: whiteRatingAfter,
        ratingDelta: whiteDelta,
      },
      black: {
        userId: blackPlayerId,
        ratingBefore: blackRatingBefore,
        ratingAfter: blackRatingAfter,
        ratingDelta: blackDelta,
      },
      finishedAt: now.toISOString(),
    };
  }

  async getMatchParticipants(
    matchId: string,
  ): Promise<{ whitePlayerId: string; blackPlayerId: string } | null> {
    const query = ObjectId.isValid(matchId)
      ? { $or: [{ _id: new ObjectId(matchId) }, { matchId }] }
      : { matchId };

    const rankedMatch = await this.matchesCollection().findOne(query, {
      projection: { whitePlayerId: 1, blackPlayerId: 1 },
    });

    if (
      rankedMatch &&
      typeof rankedMatch.whitePlayerId === "string" &&
      typeof rankedMatch.blackPlayerId === "string"
    ) {
      return {
        whitePlayerId: rankedMatch.whitePlayerId,
        blackPlayerId: rankedMatch.blackPlayerId,
      };
    }

    const gameMatch = await this.gamesCollection().findOne(query, {
      projection: { whitePlayerId: 1, blackPlayerId: 1 },
    });

    if (
      !gameMatch ||
      typeof gameMatch.whitePlayerId !== "string" ||
      typeof gameMatch.blackPlayerId !== "string"
    ) {
      return null;
    }

    return {
      whitePlayerId: gameMatch.whitePlayerId,
      blackPlayerId: gameMatch.blackPlayerId,
    };
  }

  async completeRoomGameByResignation(
    matchId: string,
    resignedByUserId: string,
  ): Promise<{ result: string; finishedAt: string } | null> {
    const query = ObjectId.isValid(matchId)
      ? { $or: [{ _id: new ObjectId(matchId) }, { matchId }] }
      : { matchId };

    const game = await this.gamesCollection().findOne(query, {
      projection: {
        _id: 1,
        mode: 1,
        roomCode: 1,
        whitePlayerId: 1,
        blackPlayerId: 1,
        result: 1,
        finishedAt: 1,
        status: 1,
      },
    });

    if (!game || String(game.mode || "") !== "room") {
      return null;
    }

    const whitePlayerId = String(game.whitePlayerId || "");
    const blackPlayerId = String(game.blackPlayerId || "");
    if (!whitePlayerId || !blackPlayerId) {
      throw new BadRequestException("Room game participants are invalid");
    }

    if (
      resignedByUserId !== whitePlayerId &&
      resignedByUserId !== blackPlayerId
    ) {
      throw new BadRequestException(
        "User is not a participant of this room game",
      );
    }

    const toGatewayResult = (raw: unknown): string => {
      const normalized = typeof raw === "string" ? raw.toLowerCase() : "";
      if (
        normalized === "1-0" ||
        normalized === "white_win" ||
        normalized === "whitewin"
      ) {
        return "WhiteWin";
      }
      if (
        normalized === "0-1" ||
        normalized === "black_win" ||
        normalized === "blackwin"
      ) {
        return "BlackWin";
      }
      return "Draw";
    };

    if (game.finishedAt || game.status === "completed" || game.result) {
      return {
        result: toGatewayResult(game.result),
        finishedAt: game.finishedAt
          ? new Date(game.finishedAt).toISOString()
          : new Date().toISOString(),
      };
    }

    const persistedResult =
      resignedByUserId === whitePlayerId ? "black_win" : "white_win";
    const now = new Date();

    await this.gamesCollection().updateOne(
      { _id: game._id },
      {
        $set: {
          result: persistedResult,
          status: "completed",
          state: "Finished",
          endReason: "resignation",
          updatedAt: now,
          finishedAt: now,
        },
      },
    );

    const roomCode =
      typeof game.roomCode === "string" ? game.roomCode.trim() : "";
    if (roomCode) {
      await this.mongoService
        .getDb()
        .collection("rooms")
        .updateOne(
          { $or: [{ roomCode }, { code: roomCode }] },
          {
            $set: {
              status: "finished",
              activeGameId: null,
              updatedAt: now,
              finishedAt: now,
            },
          },
        );
    }

    return {
      result: persistedResult === "white_win" ? "WhiteWin" : "BlackWin",
      finishedAt: now.toISOString(),
    };
  }

  async completeRankedMatchByDisconnect(
    matchId: string,
    disconnectedUserId: string,
  ): Promise<
    | {
        result: string;
        finishedAt: string;
        whitePlayerId: string;
        blackPlayerId: string;
      }
    | null
  > {
    const query = ObjectId.isValid(matchId)
      ? { $or: [{ _id: new ObjectId(matchId) }, { matchId }] }
      : { matchId };

    const rankedMatch = await this.matchesCollection().findOne(query, {
      projection: {
        _id: 1,
        matchId: 1,
        whitePlayerId: 1,
        blackPlayerId: 1,
      },
    });

    if (!rankedMatch) {
      return null;
    }

    const whitePlayerId = String(rankedMatch.whitePlayerId || "");
    const blackPlayerId = String(rankedMatch.blackPlayerId || "");

    if (
      disconnectedUserId !== whitePlayerId &&
      disconnectedUserId !== blackPlayerId
    ) {
      return null;
    }

    const completion = await this.completeRankedMatch(
      { userId: disconnectedUserId, roles: [] },
      matchId,
      {
        reason: "forfeit",
        result:
          disconnectedUserId === whitePlayerId
            ? RankedMatchCompletionResult.BLACK_WIN
            : RankedMatchCompletionResult.WHITE_WIN,
      },
    );

    const rawResult = String(completion?.result || "").toLowerCase();
    let result = "Draw";
    if (
      rawResult === "1-0" ||
      rawResult === "white_win" ||
      rawResult === "whitewin"
    ) {
      result = "WhiteWin";
    } else if (
      rawResult === "0-1" ||
      rawResult === "black_win" ||
      rawResult === "blackwin"
    ) {
      result = "BlackWin";
    }

    return {
      result,
      finishedAt:
        typeof completion?.finishedAt === "string"
          ? completion.finishedAt
          : new Date().toISOString(),
      whitePlayerId,
      blackPlayerId,
    };
  }

  async isUserInMatch(matchId: string, userId: string): Promise<boolean> {
    const participants = await this.getMatchParticipants(matchId);
    if (!participants) return false;
    return (
      participants.whitePlayerId === userId ||
      participants.blackPlayerId === userId
    );
  }

  async tryMatchForUser(
    userId: string,
    timeControl?: RankedTimeControl,
  ): Promise<RankedMatchResult | null> {
    const userActiveMatch = await this.getActiveRankedMatchForUser(userId);
    if (userActiveMatch) {
      await this.cancelWaitingQueueEntry(userId);
      return null;
    }

    const queue = this.queueCollection();

    const self = (await queue.findOne({
      userId,
      status: "waiting",
      ...(timeControl ? { timeControl } : {}),
    })) as QueueEntryDoc | null;

    if (!self) return null;

    const selfRating = await this.getUserRating(self.userId);
    const nowMs = Date.now();
    const selfWaitSeconds = Math.max(
      0,
      Math.floor((nowMs - new Date(self.joinedAt).getTime()) / 1000),
    );
    const selfMaxGap = this.getAllowedEloGap(selfWaitSeconds);

    const candidates = (await queue
      .find({
        status: "waiting",
        userId: { $ne: self.userId },
        timeControl: self.timeControl,
      })
      .toArray()) as QueueEntryDoc[];

    if (candidates.length === 0) return null;

    const candidateRatings = await Promise.all(
      candidates.map(async (entry) => ({
        entry,
        rating: await this.getUserRating(entry.userId),
      })),
    );

    const candidateRatingsWithoutActiveMatches = [];
    for (const candidate of candidateRatings) {
      const active = await this.getActiveRankedMatchForUser(candidate.entry.userId);
      if (active) {
        await this.cancelWaitingQueueEntry(candidate.entry.userId);
        continue;
      }
      candidateRatingsWithoutActiveMatches.push(candidate);
    }

    const colorCompatibleCandidates = candidateRatingsWithoutActiveMatches.filter(
      ({ entry }) => this.isColorCompatible(self.preferredColor, entry.preferredColor),
    );

    const candidatePool =
      colorCompatibleCandidates.length > 0 ||
      !this.shouldRelaxColorPreference(selfWaitSeconds)
        ? colorCompatibleCandidates
        : candidateRatingsWithoutActiveMatches;

    const validCandidates = candidatePool
      .map(({ entry, rating }) => {
        const waitSeconds = Math.max(
          0,
          Math.floor((nowMs - new Date(entry.joinedAt).getTime()) / 1000),
        );
        const candidateMaxGap = this.getAllowedEloGap(waitSeconds);
        const gap = Math.abs(selfRating - rating);
        return {
          entry,
          rating,
          waitSeconds,
          gap,
          allowedGap: Math.max(selfMaxGap, candidateMaxGap),
        };
      })
      .filter((it) => it.gap <= it.allowedGap)
      .sort((a, b) => {
        if (a.gap !== b.gap) return a.gap - b.gap;
        return b.waitSeconds - a.waitSeconds;
      });

    if (validCandidates.length === 0) return null;

    const chosen = validCandidates[0];
    const opponent = chosen.entry;

    const claimedSelf = await queue.updateOne(
      { _id: self._id, status: "waiting" },
      {
        $set: {
          status: "matched",
          updatedAt: new Date(),
          matchedAt: new Date(),
        },
      },
    );
    if (claimedSelf.modifiedCount === 0) {
      return null;
    }

    const claimedOpponent = await queue.updateOne(
      { _id: opponent._id, status: "waiting" },
      {
        $set: {
          status: "matched",
          updatedAt: new Date(),
          matchedAt: new Date(),
        },
      },
    );

    if (claimedOpponent.modifiedCount === 0) {
      await queue.updateOne(
        { _id: self._id, status: "matched" },
        {
          $set: {
            status: "waiting",
            updatedAt: new Date(),
          },
          $unset: {
            matchedAt: "",
          },
        },
      );
      return null;
    }

    const [selfActiveAfterClaim, opponentActiveAfterClaim] = await Promise.all([
      this.getActiveRankedMatchForUser(self.userId),
      this.getActiveRankedMatchForUser(opponent.userId),
    ]);
    if (selfActiveAfterClaim || opponentActiveAfterClaim) {
      await queue.updateMany(
        { _id: { $in: [self._id, opponent._id] }, status: "matched" },
        {
          $set: {
            status: "waiting",
            updatedAt: new Date(),
          },
          $unset: {
            matchedAt: "",
          },
        },
      );
      return null;
    }

    const colors = this.decideColors(
      { userId: self.userId, preferredColor: self.preferredColor },
      { userId: opponent.userId, preferredColor: opponent.preferredColor },
    );

    const now = new Date();
    const gameInsert = await this.gamesCollection().insertOne({
      mode: CompetitionGameMode.RANKED,
      state: "InGame",
      status: "active",
      whitePlayerId: colors.whitePlayerId,
      blackPlayerId: colors.blackPlayerId,
      result: null,
      initialFEN: this.initialFen,
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
    });

    const matchId = gameInsert.insertedId.toString();

    await this.matchesCollection().insertOne({
      matchId,
      gameId: gameInsert.insertedId,
      timeControl: self.timeControl,
      whitePlayerId: colors.whitePlayerId,
      blackPlayerId: colors.blackPlayerId,
      whiteRating:
        colors.whitePlayerId === self.userId ? selfRating : chosen.rating,
      blackRating:
        colors.blackPlayerId === self.userId ? selfRating : chosen.rating,
      createdAt: now,
      status: "active",
      matchQuality: {
        eloGap: chosen.gap,
        selfWaitSeconds,
        opponentWaitSeconds: chosen.waitSeconds,
      },
    });

    await queue.updateMany(
      { _id: { $in: [self._id, opponent._id] } },
      {
        $set: {
          matchId,
          updatedAt: now,
        },
      },
    );

    const [whiteProfile, blackProfile] = await Promise.all([
      this.getUserProfile(colors.whitePlayerId),
      this.getUserProfile(colors.blackPlayerId),
    ]);

    return {
      matchId,
      timeControl: self.timeControl,
      white: {
        userId: colors.whitePlayerId,
        username: whiteProfile.username,
        rating: whiteProfile.rating,
      },
      black: {
        userId: colors.blackPlayerId,
        username: blackProfile.username,
        rating: blackProfile.rating,
      },
      createdAt: now.toISOString(),
    };
  }

  async tryMatchNextPair(
    timeControl?: RankedTimeControl,
  ): Promise<RankedMatchResult | null> {
    const waitingEntries = await this.getWaitingQueueEntries(timeControl);
    if (waitingEntries.length < 2) return null;

    const ratingCache = new Map<string, number | null>();
    const waitCache = new Map<string, number>();
    const activeMatchCache = new Map<string, ActiveRankedMatchInfo | null>();

    const getWaitSeconds = (entry: WaitingQueueEntry): number => {
      const key = entry._id.toString();
      const cached = waitCache.get(key);
      if (typeof cached === "number") return cached;

      const waitSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(entry.joinedAt).getTime()) / 1000),
      );
      waitCache.set(key, waitSeconds);
      return waitSeconds;
    };

    const getRatingSafe = async (
      entry: WaitingQueueEntry,
    ): Promise<number | null> => {
      const key = entry._id.toString();
      if (ratingCache.has(key)) {
        return ratingCache.get(key) ?? null;
      }

      try {
        const rating = await this.getUserRating(entry.userId);
        ratingCache.set(key, rating);
        return rating;
      } catch (error) {
        this.logger.warn(
          `Skip invalid queue user ${entry.userId} (${key}) during matchmaking: ${(error as Error).message}`,
        );
        await this.cancelWaitingQueueEntry(entry.userId);
        ratingCache.set(key, null);
        return null;
      }
    };

    const hasActiveMatch = async (userId: string): Promise<boolean> => {
      if (activeMatchCache.has(userId)) {
        return Boolean(activeMatchCache.get(userId));
      }
      const active = await this.getActiveRankedMatchForUser(userId);
      activeMatchCache.set(userId, active);
      return Boolean(active);
    };

    for (let i = 0; i < waitingEntries.length - 1; i += 1) {
      const first = waitingEntries[i];
      if (await hasActiveMatch(first.userId)) {
        await this.cancelWaitingQueueEntry(first.userId);
        continue;
      }
      const firstRating = await getRatingSafe(first);
      if (firstRating === null) continue;

      for (let j = i + 1; j < waitingEntries.length; j += 1) {
        const second = waitingEntries[j];
        if (first.userId === second.userId) continue;
        if (first.timeControl !== second.timeControl) continue;
        if (await hasActiveMatch(second.userId)) {
          await this.cancelWaitingQueueEntry(second.userId);
          continue;
        }

        const secondRating = await getRatingSafe(second);
        if (secondRating === null) continue;

        const firstWaitSeconds = getWaitSeconds(first);
        const secondWaitSeconds = getWaitSeconds(second);

        const eloGap = Math.abs(firstRating - secondRating);
        const allowedGap = Math.max(
          this.getAllowedEloGap(firstWaitSeconds),
          this.getAllowedEloGap(secondWaitSeconds),
        );

        const colorCompatible = this.isColorCompatible(
          first.preferredColor,
          second.preferredColor,
        );
        const relaxColor =
          this.shouldRelaxColorPreference(firstWaitSeconds) ||
          this.shouldRelaxColorPreference(secondWaitSeconds);

        if (eloGap > allowedGap) continue;
        if (!colorCompatible && !relaxColor) continue;

        const claimed = await Promise.all([
          this.queueCollection().updateOne(
            { _id: first._id, status: "waiting" },
            {
              $set: {
                status: "matched",
                updatedAt: new Date(),
                matchedAt: new Date(),
              },
            },
          ),
          this.queueCollection().updateOne(
            { _id: second._id, status: "waiting" },
            {
              $set: {
                status: "matched",
                updatedAt: new Date(),
                matchedAt: new Date(),
              },
            },
          ),
        ]);

        if (claimed[0].modifiedCount === 0 || claimed[1].modifiedCount === 0) {
          if (claimed[0].modifiedCount > 0) {
            await this.queueCollection().updateOne(
              { _id: first._id, status: "matched" },
              {
                $set: {
                  status: "waiting",
                  updatedAt: new Date(),
                },
                $unset: {
                  matchedAt: "",
                },
              },
            );
          }
          if (claimed[1].modifiedCount > 0) {
            await this.queueCollection().updateOne(
              { _id: second._id, status: "matched" },
              {
                $set: {
                  status: "waiting",
                  updatedAt: new Date(),
                },
                $unset: {
                  matchedAt: "",
                },
              },
            );
          }
          continue;
        }

        const [firstActiveAfterClaim, secondActiveAfterClaim] = await Promise.all([
          this.getActiveRankedMatchForUser(first.userId),
          this.getActiveRankedMatchForUser(second.userId),
        ]);
        if (firstActiveAfterClaim || secondActiveAfterClaim) {
          await this.queueCollection().updateMany(
            { _id: { $in: [first._id, second._id] }, status: "matched" },
            {
              $set: {
                status: "waiting",
                updatedAt: new Date(),
              },
              $unset: {
                matchedAt: "",
              },
            },
          );
          continue;
        }

        const colors = this.decideColors(
          { userId: first.userId, preferredColor: first.preferredColor },
          { userId: second.userId, preferredColor: second.preferredColor },
        );

        const now = new Date();
        const gameInsert = await this.gamesCollection().insertOne({
          mode: CompetitionGameMode.RANKED,
          state: "InGame",
          status: "active",
          whitePlayerId: colors.whitePlayerId,
          blackPlayerId: colors.blackPlayerId,
          result: null,
          initialFEN: this.initialFen,
          createdAt: now,
          updatedAt: now,
          finishedAt: null,
        });

        const matchId = gameInsert.insertedId.toString();

        await this.matchesCollection().insertOne({
          matchId,
          gameId: gameInsert.insertedId,
          timeControl: first.timeControl,
          whitePlayerId: colors.whitePlayerId,
          blackPlayerId: colors.blackPlayerId,
          whiteRating:
            colors.whitePlayerId === first.userId ? firstRating : secondRating,
          blackRating:
            colors.blackPlayerId === first.userId ? firstRating : secondRating,
          createdAt: now,
          status: "active",
          matchQuality: {
            eloGap,
            firstWaitSeconds,
            secondWaitSeconds,
          },
        });

        await this.queueCollection().updateMany(
          { _id: { $in: [first._id, second._id] } },
          {
            $set: {
              matchId,
              updatedAt: now,
            },
          },
        );

        const [whiteProfile, blackProfile] = await Promise.all([
          this.getUserProfile(colors.whitePlayerId),
          this.getUserProfile(colors.blackPlayerId),
        ]);

        return {
          matchId,
          timeControl: first.timeControl,
          white: {
            userId: colors.whitePlayerId,
            username: whiteProfile.username,
            rating: whiteProfile.rating,
          },
          black: {
            userId: colors.blackPlayerId,
            username: blackProfile.username,
            rating: blackProfile.rating,
          },
          createdAt: now.toISOString(),
        };
      }
    }

    return null;
  }

  async getRankedHistory(
    user: AuthenticatedUser,
    query: RankedPaginationQueryDto,
  ): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb();
    const games = db.collection("games");
    const rankedMatches = db.collection("ranked_matches");
    const profiles = db.collection<{
      _id: string;
      username?: string | null;
      avatarUrl?: string | null;
    }>("user_profiles");

    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const filter = {
      mode: CompetitionGameMode.RANKED,
      $or: [{ whitePlayerId: user.userId }, { blackPlayerId: user.userId }],
    };

    const [items, total] = await Promise.all([
      games
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      games.countDocuments(filter),
    ]);

    const playerIds = Array.from(
      new Set(
        items
          .flatMap((item) => [item.whitePlayerId, item.blackPlayerId])
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
      ),
    );

    const usernames =
      playerIds.length > 0
        ? await profiles
            .find(
              { _id: { $in: playerIds } },
              { projection: { _id: 1, username: 1, avatarUrl: 1 } },
            )
            .toArray()
        : [];

    const usernameMap = new Map<string, string>();
    const avatarMap = new Map<string, string | null>();
    for (const profile of usernames) {
      if (profile?._id && typeof profile.username === "string") {
        usernameMap.set(profile._id, profile.username);
      }
      if (profile?._id) {
        avatarMap.set(
          profile._id,
          typeof profile.avatarUrl === "string" && profile.avatarUrl.length > 0
            ? profile.avatarUrl
            : null,
        );
      }
    }

    const ratingDocs =
      playerIds.length > 0
        ? await this.ratingsCollection()
            .find(
              { _id: { $in: playerIds } },
              { projection: { _id: 1, rating: 1 } },
            )
            .toArray()
        : [];

    const ratingMap = new Map<string, number>();
    for (const doc of ratingDocs) {
      const rating = Number(doc?.rating ?? 0);
      if (
        typeof doc?._id === "string" &&
        Number.isFinite(rating) &&
        rating > 0
      ) {
        ratingMap.set(doc._id, this.normalizeRating(rating));
      }
    }

    const gameObjectIds = items
      .map((item) => item._id)
      .filter((id): id is ObjectId => id instanceof ObjectId);

    const gameHexIds = items
      .map((item) => {
        const rawId = item._id;
        if (rawId instanceof ObjectId) return rawId.toHexString();
        if (typeof rawId === "string") return rawId;
        return null;
      })
      .filter((id): id is string => typeof id === "string");

    const rankedMatchDocs =
      gameObjectIds.length > 0 || gameHexIds.length > 0
        ? await rankedMatches
            .find(
              {
                $or: [
                  gameObjectIds.length > 0
                    ? { gameId: { $in: gameObjectIds } }
                    : { _id: { $exists: false } },
                  gameHexIds.length > 0
                    ? { matchId: { $in: gameHexIds } }
                    : { _id: { $exists: false } },
                ],
              },
              {
                projection: {
                  gameId: 1,
                  matchId: 1,
                  whiteRatingBefore: 1,
                  blackRatingBefore: 1,
                  whiteRatingAfter: 1,
                  blackRatingAfter: 1,
                  whiteRating: 1,
                  blackRating: 1,
                },
              },
            )
            .toArray()
        : [];

    const ratingByGameId = new Map<string, Record<string, unknown>>();
    for (const doc of rankedMatchDocs) {
      const gameIdKey =
        doc?.gameId instanceof ObjectId
          ? doc.gameId.toHexString()
          : typeof doc?.gameId === "string"
            ? doc.gameId
            : typeof doc?.matchId === "string"
              ? doc.matchId
              : null;

      if (gameIdKey) {
        ratingByGameId.set(gameIdKey, doc as Record<string, unknown>);
      }
    }

    return {
      items: items.map((item) => {
        const normalizedResult =
          typeof item.result === "string" ? item.result.toLowerCase() : "";

        const persistedResult: "1-0" | "0-1" | "draw" =
          normalizedResult === "1-0" ||
          normalizedResult === "white_win" ||
          normalizedResult === "white"
            ? "1-0"
            : normalizedResult === "0-1" ||
                normalizedResult === "black_win" ||
                normalizedResult === "black"
              ? "0-1"
              : "draw";

        const playerColor =
          item.whitePlayerId === user.userId
            ? "white"
            : item.blackPlayerId === user.userId
              ? "black"
              : "white";

        const opponentId =
          playerColor === "white" ? item.blackPlayerId : item.whitePlayerId;

        const outcome = this.resolveOutcomeForUser(
          persistedResult,
          user.userId,
          item.whitePlayerId,
          item.blackPlayerId,
        );

        const gameKey =
          item._id instanceof ObjectId
            ? item._id.toHexString()
            : typeof item._id === "string"
              ? item._id
              : String(item._id);
        const ratingDoc = ratingByGameId.get(gameKey);
        const whiteBefore = Number(
          ratingDoc?.whiteRatingBefore ?? ratingDoc?.whiteRating ?? 0,
        );
        const blackBefore = Number(
          ratingDoc?.blackRatingBefore ?? ratingDoc?.blackRating ?? 0,
        );
        const whiteAfter = Number(
          ratingDoc?.whiteRatingAfter ?? ratingDoc?.whiteRating ?? whiteBefore,
        );
        const blackAfter = Number(
          ratingDoc?.blackRatingAfter ?? ratingDoc?.blackRating ?? blackBefore,
        );
        const ratingChange =
          playerColor === "white"
            ? whiteAfter - whiteBefore
            : blackAfter - blackBefore;

        const snapshotOpponentRating =
          playerColor === "white" ? blackBefore : whiteBefore;
        const opponentRating =
          snapshotOpponentRating > 0
            ? snapshotOpponentRating
            : Number(ratingMap.get(opponentId) ?? 0);

        return {
          id: item._id?.toString?.() || item._id,
          gameId: item._id?.toString?.() || item._id,
          result: outcome,
          absoluteResult: persistedResult,
          playerColor,
          whitePlayerId: item.whitePlayerId,
          blackPlayerId: item.blackPlayerId,
          whiteUsername: usernameMap.get(item.whitePlayerId) || null,
          blackUsername: usernameMap.get(item.blackPlayerId) || null,
          opponentId,
          opponentUsername: usernameMap.get(opponentId) || "Unknown",
          opponentAvatarUrl: avatarMap.get(opponentId) || null,
          opponentRating: opponentRating > 0 ? opponentRating : null,
          createdAt: item.createdAt,
          finishedAt: item.finishedAt || null,
          ratingChange,
          totalMoves: Array.isArray(item.moves)
            ? item.moves.length
            : Number(item?.metadata?.totalMoves ?? 0),
          endReason: this.normalizeEndReason(
            typeof item?.endReason === "string"
              ? item.endReason
              : typeof item?.metadata?.endReason === "string"
                ? item.metadata.endReason
                : null,
            persistedResult,
          ),
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
      },
    };
  }

  async getRankedStats(
    user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb();
    const games = db.collection("games");

    const trackedModes = [CompetitionGameMode.RANKED];
    const completedResults = [
      "1-0",
      "0-1",
      "draw",
      "win",
      "lose",
      "loss",
      "white_win",
      "black_win",
      "whitewin",
      "blackwin",
      "white",
      "black",
      "1/2-1/2",
    ];

    const rankedGames = await games
      .find({
        mode: { $in: trackedModes },
        $or: [{ whitePlayerId: user.userId }, { blackPlayerId: user.userId }],
        result: { $in: completedResults },
        finishedAt: { $exists: true, $ne: null },
        endReason: { $ne: "double_no_show" },
        status: { $nin: ["cancelled", "canceled"] },
      })
      .project({
        whitePlayerId: 1,
        blackPlayerId: 1,
        result: 1,
        finishedAt: 1,
      })
      .sort({ finishedAt: -1, createdAt: -1, _id: -1 })
      .toArray();

    const normalizeResult = (
      result: unknown,
    ): "1-0" | "0-1" | "draw" | null => {
      const value = typeof result === "string" ? result.toLowerCase() : "";
      if (["1-0", "white_win", "white", "whitewin"].includes(value))
        return "1-0";
      if (["0-1", "black_win", "black", "blackwin"].includes(value))
        return "0-1";
      if (["draw", "1/2-1/2"].includes(value)) return "draw";
      if (value === "win") return "1-0";
      if (value === "lose" || value === "loss") return "0-1";
      return null;
    };

    const resolveOutcome = (game: {
      whitePlayerId?: string | null;
      blackPlayerId?: string | null;
      result?: unknown;
    }) => {
      const rawValue =
        typeof game.result === "string" ? game.result.toLowerCase() : "";
      if (rawValue === "win") return "win" as const;
      if (rawValue === "lose" || rawValue === "loss") return "lose" as const;
      const persistedResult = normalizeResult(game.result);
      if (!persistedResult) return null;
      const isWhite = game.whitePlayerId === user.userId;
      const isBlack = game.blackPlayerId === user.userId;
      if (persistedResult === "draw") return "draw" as const;
      if (persistedResult === "1-0") return isWhite ? "win" : "lose";
      return isBlack ? "win" : "lose";
    };

    let wins = 0;
    let losses = 0;
    let draws = 0;
    const opponentIds = new Set<string>();

    let currentStreak = 0;
    let currentStreakType: "win" | "lose" | null = null;
    let bestStreak = 0;
    let bestStreakType: "win" | "lose" | null = null;
    let bestRunType: "win" | "lose" | null = null;
    let bestRunLength = 0;
    let currentStreakActive = false;

    for (const game of rankedGames) {
      const outcome = resolveOutcome(game);
      if (!outcome) continue;

      const opponentId =
        game.whitePlayerId === user.userId
          ? game.blackPlayerId
          : game.whitePlayerId;
      if (typeof opponentId === "string" && opponentId.length > 0) {
        opponentIds.add(opponentId);
      }

      if (outcome === "draw") {
        draws += 1;
        if (!currentStreakActive) {
          break;
        }
        bestRunType = null;
        bestRunLength = 0;
      } else if (outcome === "win") {
        wins += 1;
        if (!currentStreakActive) {
          currentStreakActive = true;
          currentStreakType = "win";
          currentStreak = 1;
        } else if (currentStreakType === "win") {
          currentStreak += 1;
        }
        if (bestRunType === "win") {
          bestRunLength += 1;
        } else {
          bestRunType = "win";
          bestRunLength = 1;
        }
      } else if (outcome === "lose") {
        losses += 1;
        if (!currentStreakActive) {
          currentStreakActive = true;
          currentStreakType = "lose";
          currentStreak = 1;
        } else if (currentStreakType === "lose") {
          currentStreak += 1;
        }
        if (bestRunType === "lose") {
          bestRunLength += 1;
        } else {
          bestRunType = "lose";
          bestRunLength = 1;
        }
      }

      bestStreak = Math.max(bestStreak, bestRunLength);
      if (bestStreak === bestRunLength) {
        bestStreakType = bestRunType;
      }

      if (
        currentStreak > 0 &&
        currentStreakType &&
        outcome !== currentStreakType
      ) {
        break;
      }
    }

    const totalGames = rankedGames.length;
    const winRate =
      totalGames === 0 ? 0 : Number(((wins / totalGames) * 100).toFixed(2));
    const currentRating = await this.getUserRating(user.userId);
    const opponentRatings =
      opponentIds.size > 0
        ? await Promise.all(
            Array.from(opponentIds).map((opponentId) =>
              this.getUserRating(opponentId),
            ),
          )
        : [];
    const avgOpponentRating =
      opponentRatings.length > 0
        ? Number(
            (
              opponentRatings.reduce((sum, rating) => sum + rating, 0) /
              opponentRatings.length
            ).toFixed(0),
          )
        : 0;

    return {
      userId: user.userId,
      currentRating,
      gamesPlayed: totalGames,
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      currentStreak,
      currentStreakType,
      bestStreak,
      bestStreakType,
      avgOpponentRating,
    };
  }

  async getTournaments(
    query: TournamentQueryDto,
  ): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb();
    const tournaments = db.collection("tournaments");
    const tournamentParticipants = db.collection("tournament_participants");

    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: "cancelled" };
    }

    const [items, total] = await Promise.all([
      tournaments
        .find(filter)
        .sort({ startAt: 1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      tournaments.countDocuments(filter),
    ]);

    const tournamentIds = items
      .map((item) => item._id)
      .filter((id): id is ObjectId => id instanceof ObjectId);

    const participantCounts =
      tournamentIds.length > 0
        ? await tournamentParticipants
            .aggregate<{ _id: ObjectId; count: number }>([
              {
                $match: {
                  tournamentId: { $in: tournamentIds },
                  status: { $ne: "withdrawn" },
                },
              },
              {
                $group: {
                  _id: "$tournamentId",
                  count: { $sum: 1 },
                },
              },
            ])
            .toArray()
        : [];

    const participantsByTournamentId = new Map<string, number>();
    for (const row of participantCounts) {
      participantsByTournamentId.set(row._id.toHexString(), Number(row.count));
    }

    return {
      items: items.map((item) => ({
        ...item,
        id: item._id?.toString?.() || item._id,
        _id: item._id?.toString?.() || item._id,
        format: item.formatLabel || item.format,
        startDate: item.startAt,
        registrationDeadline: item.registrationDeadline || item.startAt,
        status:
          item.status === "draft" || item.status === "open"
            ? "registration"
            : item.status === "full"
              ? "full"
              : item.status,
        participants:
          participantsByTournamentId.get(item._id.toHexString()) || 0,
      })),
      pagination: {
        page,
        pageSize,
        total,
      },
    };
  }

  async createTournament(
    user: AuthenticatedUser,
    payload: CreateTournamentDto,
  ): Promise<Record<string, unknown>> {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    const registrationDeadline = payload.registrationDeadline
      ? new Date(payload.registrationDeadline)
      : startAt;

    if (Number.isNaN(registrationDeadline.getTime())) {
      throw new BadRequestException("registrationDeadline khong hop le");
    }

    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException("startAt phai nho hon endAt");
    }
    if (registrationDeadline.getTime() >= startAt.getTime()) {
      throw new BadRequestException(
        "registrationDeadline phai nho hon startAt",
      );
    }

    const db = this.mongoService.getDb();
    const tournaments = db.collection("tournaments");

    const now = new Date();
    const document = {
      name: payload.name,
      description: payload.description || null,
      prize: payload.prize || null,
      format: payload.format,
      formatLabel: "Single Elimination",
      timeControl: payload.timeControl || "10+0",
      startAt,
      endAt,
      registrationDeadline,
      maxParticipants: payload.maxParticipants,
      createdBy: user.userId,
      status: "registration",
      participants: 0,
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await tournaments.insertOne(document);

    return {
      id: result.insertedId.toString(),
      ...document,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      registrationDeadline: registrationDeadline.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async getTournamentById(
    tournamentId: string,
  ): Promise<Record<string, unknown>> {
    const db = this.mongoService.getDb();
    const tournaments = db.collection("tournaments");
    const tournamentParticipants = db.collection("tournament_participants");
    const userProfiles = db.collection<{
      _id: string;
      username?: string;
      rating?: number;
    }>("user_profiles");

    const query = ObjectId.isValid(tournamentId)
      ? { _id: new ObjectId(tournamentId) }
      : { tournamentId };
    const tournament = await tournaments.findOne(query);

    if (!tournament) {
      throw new NotFoundException("Khong tim thay tournament");
    }

    const participantsRaw = await tournamentParticipants
      .find({ tournamentId: tournament._id, status: { $ne: "withdrawn" } })
      .sort({ seed: 1, joinedAt: 1 })
      .toArray();

    const participantUserIds = participantsRaw
      .map((participant) => participant.userId)
      .filter((userId): userId is string => typeof userId === "string");

    const profiles =
      participantUserIds.length > 0
        ? await userProfiles
            .find(
              { _id: { $in: participantUserIds } },
              { projection: { _id: 1, username: 1, rating: 1 } },
            )
            .toArray()
        : [];

    const profileMap = new Map<
      string,
      { username?: string; rating?: number }
    >();
    for (const profile of profiles) {
      profileMap.set(profile._id, {
        username: profile.username,
        rating: profile.rating,
      });
    }

    const participants = participantsRaw.map((participant, index) => {
      const userId = String(participant.userId || "");
      const profile = profileMap.get(userId);
      return {
        id: userId || `participant-${index + 1}`,
        userId,
        username:
          (typeof participant.username === "string" && participant.username) ||
          profile?.username ||
          `Player ${index + 1}`,
        rating: Number(participant.rating ?? profile?.rating ?? 1200),
        seed: Number(participant.seed ?? index + 1),
        status: participant.status || "active",
        joinedAt: participant.joinedAt || null,
      };
    });

    const organizerIdRaw =
      tournament.createdBy ||
      tournament.organizerId ||
      tournament.ownerUserId ||
      (tournament.organizer as Record<string, unknown> | undefined)?.userId ||
      (tournament.organizer as Record<string, unknown> | undefined)?._id ||
      (tournament.organizer as Record<string, unknown> | undefined)?.id ||
      "";
    const organizerId = (() => {
      if (typeof organizerIdRaw === "string") {
        const match = organizerIdRaw.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
        return match?.[1] || organizerIdRaw;
      }
      if (
        organizerIdRaw &&
        typeof organizerIdRaw === "object" &&
        "toString" in organizerIdRaw &&
        typeof (organizerIdRaw as { toString?: unknown }).toString ===
          "function"
      ) {
        const asString = (
          organizerIdRaw as { toString: () => string }
        ).toString();
        const match = asString.match(/ObjectId\("([a-fA-F0-9]{24})"\)/);
        return match?.[1] || asString;
      }
      return "";
    })();
    const organizerProfile = organizerId
      ? profileMap.get(organizerId) ||
        (await userProfiles.findOne(
          { _id: organizerId },
          { projection: { _id: 1, username: 1 } },
        )) ||
        null
      : null;

    return {
      ...tournament,
      id: tournament._id?.toString?.() || tournament._id,
      _id: tournament._id?.toString?.() || tournament._id,
      format: tournament.formatLabel || tournament.format,
      startDate: tournament.startAt,
      registrationDeadline:
        tournament.registrationDeadline || tournament.startAt,
      organizerId: organizerId || null,
      organizer: {
        userId: organizerId || null,
        username:
          organizerProfile?.username ||
          (typeof tournament.organizer === "string"
            ? tournament.organizer
            : null) ||
          (typeof tournament.organizerName === "string"
            ? tournament.organizerName
            : null) ||
          (typeof tournament.createdBy === "string"
            ? tournament.createdBy
            : null) ||
          "Unknown",
      },
      participants,
      status:
        tournament.status === "draft" || tournament.status === "open"
          ? "registration"
          : tournament.status,
    };
  }

  async createGame(
    user: AuthenticatedUser,
    payload: CreateCompetitionGameDto,
  ): Promise<Record<string, unknown>> {
    if (
      payload.mode === CompetitionGameMode.TOURNAMENT &&
      !payload.tournamentId
    ) {
      throw new BadRequestException(
        "tournamentId la bat buoc voi mode tournament",
      );
    }

    const db = this.mongoService.getDb();
    const games = db.collection("games");

    const now = new Date();
    const game = {
      mode: payload.mode,
      whitePlayerId: user.userId,
      blackPlayerId: payload.opponentId,
      tournamentId: payload.tournamentId || null,
      initialFen: payload.initialFen || null,
      status: "pending",
      result: null,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await games.insertOne(game);

    return {
      id: insertResult.insertedId.toString(),
      ...game,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  extractUser(
    principal: Record<string, unknown> | undefined,
  ): AuthenticatedUser {
    const userIdCandidate =
      principal?.sub || principal?.userId || principal?.id;
    if (typeof userIdCandidate !== "string" || !userIdCandidate.trim()) {
      throw new BadRequestException("Token khong chua user id hop le");
    }

    const rolesFromToken = Array.isArray(principal?.roles)
      ? (principal?.roles.filter(
          (role): role is string => typeof role === "string",
        ) as string[])
      : [];

    return {
      userId: userIdCandidate,
      roles: rolesFromToken,
    };
  }
}
