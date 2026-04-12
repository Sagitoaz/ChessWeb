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

@Injectable()
export class CompetitionService {
  constructor(private readonly mongoService: MongoService) {}

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

    return (await this.queueCollection()
      .find(match)
      .sort({ joinedAt: 1, _id: 1 })
      .toArray()) as WaitingQueueEntry[];
  }

  async joinQueue(
    user: AuthenticatedUser,
    payload: JoinRankedQueueDto,
  ): Promise<Record<string, unknown>> {
    const rankedQueue = this.queueCollection();

    const existingWaiting = await rankedQueue.findOne({
      userId: user.userId,
      status: "waiting",
    });
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
    const insertResult = await rankedQueue.insertOne({
      userId: user.userId,
      status: "waiting",
      joinedAt: now,
      updatedAt: now,
      timeControl,
      preferredColor,
      ratingSnapshot: userRating,
    });

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
          endReason: payload.reason || null,
          moves: Array.isArray(payload.moves)
            ? payload.moves
            : game.moves || [],
          updatedAt: now,
          finishedAt: now,
        },
      },
    );

    await this.matchesCollection().updateOne(
      { _id: match._id },
      {
        $set: {
          status: "completed",
          result: persistedResult,
          endReason: payload.reason || null,
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
      endReason: payload.reason || null,
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

    const colorCompatibleCandidates = candidateRatings.filter(({ entry }) =>
      this.isColorCompatible(self.preferredColor, entry.preferredColor),
    );

    const candidatePool =
      colorCompatibleCandidates.length > 0 ||
      !this.shouldRelaxColorPreference(selfWaitSeconds)
        ? colorCompatibleCandidates
        : candidateRatings;

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

    for (let i = 0; i < waitingEntries.length - 1; i += 1) {
      const first = waitingEntries[i];
      const firstRating = await getRatingSafe(first);
      if (firstRating === null) continue;

      for (let j = i + 1; j < waitingEntries.length; j += 1) {
        const second = waitingEntries[j];
        if (first.timeControl !== second.timeControl) continue;

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
    const profiles = db.collection<{ _id: string; username?: string | null }>(
      "user_profiles",
    );

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
              { projection: { _id: 1, username: 1 } },
            )
            .toArray()
        : [];

    const usernameMap = new Map<string, string>();
    for (const profile of usernames) {
      if (profile?._id && typeof profile.username === "string") {
        usernameMap.set(profile._id, profile.username);
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
          createdAt: item.createdAt,
          finishedAt: item.finishedAt || null,
          ratingChange,
          totalMoves: Array.isArray(item.moves)
            ? item.moves.length
            : Number(item?.metadata?.totalMoves ?? 0),
          endReason:
            typeof item?.endReason === "string"
              ? item.endReason
              : typeof item?.metadata?.endReason === "string"
                ? item.metadata.endReason
                : "draw",
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

    const rankedGames = await games
      .find({
        mode: CompetitionGameMode.RANKED,
        $or: [{ whitePlayerId: user.userId }, { blackPlayerId: user.userId }],
      })
      .project({ whitePlayerId: 1, blackPlayerId: 1, result: 1 })
      .toArray();

    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const game of rankedGames) {
      const result =
        typeof game.result === "string" ? game.result.toLowerCase() : "";
      const isWhite = game.whitePlayerId === user.userId;
      const isBlack = game.blackPlayerId === user.userId;

      if (result === "draw" || result === "1/2-1/2") {
        draws += 1;
      } else if (
        (isWhite && ["1-0", "white_win", "white"].includes(result)) ||
        (isBlack && ["0-1", "black_win", "black"].includes(result))
      ) {
        wins += 1;
      } else if (
        (isWhite && ["0-1", "black_win", "black"].includes(result)) ||
        (isBlack && ["1-0", "white_win", "white"].includes(result))
      ) {
        losses += 1;
      }
    }

    const totalGames = rankedGames.length;
    const winRate =
      totalGames === 0 ? 0 : Number(((wins / totalGames) * 100).toFixed(2));
    const currentRating = await this.getUserRating(user.userId);

    return {
      userId: user.userId,
      currentRating,
      totalGames,
      wins,
      losses,
      draws,
      winRate,
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

    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException("startAt phai nho hon endAt");
    }

    const db = this.mongoService.getDb();
    const tournaments = db.collection("tournaments");

    const now = new Date();
    const document = {
      name: payload.name,
      format: payload.format,
      formatLabel:
        payload.format === "knockout"
          ? "Single Elimination"
          : payload.format === "round_robin"
            ? "Round Robin"
            : "Swiss",
      startAt,
      endAt,
      registrationDeadline: startAt,
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

    return {
      ...tournament,
      id: tournament._id?.toString?.() || tournament._id,
      _id: tournament._id?.toString?.() || tournament._id,
      format: tournament.formatLabel || tournament.format,
      startDate: tournament.startAt,
      registrationDeadline:
        tournament.registrationDeadline || tournament.startAt,
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
