import { Injectable } from "@nestjs/common";
import { Collection } from "mongodb";
import { MongoService } from "../../shared/db/mongo.service";
import {
  EmailVerificationTokenDoc,
  LeaderboardEntryDoc,
  LeaderboardQuery,
  LeaderboardQueryResult,
  ProfileRepositoryPort,
  UserGameDoc,
  UserGamesQuery,
  UserGamesQueryResult,
  UserProfileDoc,
  UserRatingDoc,
  UserStatsDoc,
  VerifyTokenResult,
} from "./profile.repository.port";

interface GameDoc {
  _id: { toHexString?: () => string } | string;
  mode?: string | null;
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
  result?: string | null;
  rawResult?: string | null;
  moves?: unknown[] | null;
  metadata?: { totalMoves?: number | null } | null;
  createdAt?: Date | null;
  finishedAt?: Date | null;
}

interface UsernameDoc {
  _id: string;
  username?: string | null;
  displayName?: string | null;
}

@Injectable()
export class ProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly mongoService: MongoService) {}

  private userProfiles(): Collection<UserProfileDoc> {
    return this.mongoService
      .getDb()
      .collection<UserProfileDoc>("user_profiles");
  }

  private emailVerificationTokens(): Collection<EmailVerificationTokenDoc> {
    return this.mongoService
      .getDb()
      .collection<EmailVerificationTokenDoc>("email_verification_tokens");
  }

  private userStats(): Collection<UserStatsDoc> {
    return this.mongoService.getDb().collection<UserStatsDoc>("user_stats");
  }

  private userRatings(): Collection<UserRatingDoc> {
    return this.mongoService.getDb().collection<UserRatingDoc>("user_ratings");
  }

  private games(): Collection<GameDoc> {
    return this.mongoService.getDb().collection<GameDoc>("games");
  }

  async findUserProfileById(userId: string): Promise<UserProfileDoc | null> {
    return this.userProfiles().findOne({ _id: userId });
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    const profile = await this.userProfiles().findOne(
      { _id: userId },
      {
        projection: {
          passwordHash: 1,
        },
      },
    );

    if (
      !profile ||
      !profile.passwordHash ||
      typeof profile.passwordHash !== "string"
    )
      return null;
    return profile.passwordHash;
  }

  async updatePasswordHashByUserId(
    userId: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.userProfiles().updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          updatedAt: now,
        },
      },
    );

    return result.matchedCount > 0;
  }

  async updateUserAvatarById(
    userId: string,
    avatar: { avatarUrl: string; avatarPublicId: string | null; now: Date },
  ): Promise<UserProfileDoc | null> {
    const result = await this.userProfiles().findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          avatarUrl: avatar.avatarUrl,
          avatarPublicId: avatar.avatarPublicId,
          avatarUpdatedAt: avatar.now,
          updatedAt: avatar.now,
        },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async findUserStatsByUserId(userId: string): Promise<UserStatsDoc | null> {
    return this.userStats().findOne({ userId });
  }

  async findUserRatingByUserId(userId: string): Promise<UserRatingDoc | null> {
    return this.userRatings().findOne({ _id: userId });
  }

  async updateUserProfileDisplayName(
    userId: string,
    displayName: string | null,
  ): Promise<UserProfileDoc | null> {
    const now = new Date();
    const result = await this.userProfiles().findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          displayName,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async findLeaderboard(
    query: LeaderboardQuery,
  ): Promise<LeaderboardQueryResult> {
    const { page, pageSize, mode, sort } = query;
    const skip = (page - 1) * pageSize;

    const modeFieldExists = mode
      ? (await this.userRatings().countDocuments(
          { mode: { $exists: true } },
          { limit: 1 },
        )) > 0
      : false;
    const canApplyMode = Boolean(mode && modeFieldExists);

    const modeMatchStage = canApplyMode ? [{ $match: { mode } }] : [];

    const sortStage =
      sort === "rating_asc"
        ? { rating: 1, peakRating: -1, _id: 1 }
        : sort === "peak_desc"
          ? { peakRating: -1, rating: -1, _id: 1 }
          : sort === "peak_asc"
            ? { peakRating: 1, rating: -1, _id: 1 }
            : { rating: -1, peakRating: -1, _id: 1 };

    const pipeline = [
      ...modeMatchStage,
      {
        $project: {
          _id: 1,
          rating: { $ifNull: ["$rating", 0] },
          peakRating: { $ifNull: ["$peakRating", 0] },
          updatedAt: 1,
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $lookup: {
                from: "user_profiles",
                localField: "_id",
                foreignField: "_id",
                as: "profile",
              },
            },
            {
              $project: {
                userId: { $toString: "$_id" },
                rating: 1,
                peakRating: 1,
                updatedAt: 1,
                username: {
                  $ifNull: [{ $arrayElemAt: ["$profile.username", 0] }, null],
                },
                displayName: {
                  $ifNull: [
                    { $arrayElemAt: ["$profile.displayName", 0] },
                    null,
                  ],
                },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.userRatings()
      .aggregate<{
        items: LeaderboardEntryDoc[];
        total: Array<{ count: number }>;
      }>(pipeline)
      .toArray();

    const items = result?.items || [];
    const total = result?.total?.[0]?.count || 0;

    return {
      items,
      total,
      modeApplied: canApplyMode,
    };
  }

  async findUserGames(
    userId: string,
    query: UserGamesQuery,
  ): Promise<UserGamesQueryResult> {
    const { page, pageSize, mode, result, fromDate, toDate } = query;
    const skip = (page - 1) * pageSize;

    const match: Record<string, unknown> = {
      $or: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      finishedAt: { $exists: true, $ne: null },
    };

    if (mode) {
      match.mode = mode;
    }

    if (result) {
      match.result = result;
    } else {
      match.result = { $in: ["win", "lose", "draw"] };
    }

    if (fromDate || toDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (fromDate) createdAtFilter.$gte = fromDate;
      if (toDate) createdAtFilter.$lte = toDate;
      match.createdAt = createdAtFilter;
    }

    const [items, total] = await Promise.all([
      this.games()
        .find(match, {
          projection: {
            _id: 1,
            mode: 1,
            whitePlayerId: 1,
            blackPlayerId: 1,
            result: 1,
            rawResult: 1,
            moves: 1,
            metadata: 1,
            createdAt: 1,
            finishedAt: 1,
          },
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.games().countDocuments(match),
    ]);

    const playerIds = Array.from(
      new Set(
        items
          .flatMap((g) => [g.whitePlayerId, g.blackPlayerId])
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
      ),
    );

    const profiles =
      playerIds.length > 0
        ? await this.userProfiles()
            .find(
              { _id: { $in: playerIds } },
              { projection: { _id: 1, username: 1, displayName: 1 } },
            )
            .toArray()
        : [];

    const usernameMap = new Map<string, string>();
    for (const profile of profiles as UsernameDoc[]) {
      const displayName =
        (typeof profile?.displayName === "string" &&
          profile.displayName.trim().length > 0
          ? profile.displayName
          : typeof profile?.username === "string" && profile.username.trim().length > 0
            ? profile.username
            : null) || null;
      if (profile?._id && displayName) {
        usernameMap.set(profile._id, displayName);
      }
    }

    const mapped: UserGameDoc[] = items.map((game) => {
      const rawId: unknown = game._id;
      let gameId = "";
      if (typeof rawId === "string") {
        gameId = rawId;
      } else if (
        rawId &&
        typeof rawId === "object" &&
        "toHexString" in rawId &&
        typeof (rawId as { toHexString?: unknown }).toHexString === "function"
      ) {
        gameId = (rawId as { toHexString: () => string }).toHexString();
      } else {
        gameId = String(rawId);
      }

      return {
        gameId,
        mode: game.mode ?? null,
        whitePlayerId: game.whitePlayerId ?? null,
        blackPlayerId: game.blackPlayerId ?? null,
        whiteUsername: game.whitePlayerId
          ? (usernameMap.get(game.whitePlayerId) ?? null)
          : null,
        blackUsername: game.blackPlayerId
          ? (usernameMap.get(game.blackPlayerId) ?? null)
          : null,
        result: game.result ?? null,
        rawResult: game.rawResult ?? null,
        totalMoves: Number(
          game.metadata?.totalMoves ??
            (Array.isArray(game.moves) ? game.moves.length : 0),
        ),
        createdAt: game.createdAt ?? null,
        finishedAt: game.finishedAt ?? null,
      };
    });

    return {
      items: mapped,
      total,
    };
  }

  async findUserModeStats(
    userId: string,
    mode?: "ranked" | "room" | "bot" | "tournament",
  ): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
  }> {
    const match: Record<string, unknown> = {
      $or: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      result: { $in: ["win", "lose", "draw"] },
      finishedAt: { $exists: true, $ne: null },
      endReason: { $ne: "double_no_show" },
      status: { $nin: ["cancelled", "canceled"] },
    };

    if (mode) {
      match.mode = mode;
    }

    const [totalGames, wins, losses, draws] = await Promise.all([
      this.games().countDocuments(match),
      this.games().countDocuments({ ...match, result: "win" }),
      this.games().countDocuments({ ...match, result: "lose" }),
      this.games().countDocuments({ ...match, result: "draw" }),
    ]);

    return {
      totalGames,
      wins,
      losses,
      draws,
    };
  }

  async createEmailVerificationToken(
    token: EmailVerificationTokenDoc,
  ): Promise<void> {
    await this.emailVerificationTokens().insertOne(token);
  }

  async verifyEmailByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<VerifyTokenResult> {
    const consumedToken = await this.emailVerificationTokens().findOneAndUpdate(
      {
        tokenHash,
        purpose: "verify_email",
        consumedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      {
        $set: {
          consumedAt: now,
        },
      },
      { returnDocument: "before" },
    );

    if (!consumedToken) {
      const pendingToken = await this.emailVerificationTokens().findOne({
        tokenHash,
        purpose: "verify_email",
        consumedAt: { $exists: false },
      });

      if (pendingToken && pendingToken.expiresAt <= now) {
        return { ok: false, reason: "TOKEN_EXPIRED" };
      }

      return { ok: false, reason: "TOKEN_NOT_FOUND" };
    }

    const updateProfileResult = await this.userProfiles().updateOne(
      { _id: consumedToken.userId },
      {
        $set: {
          isVerified: true,
          updatedAt: now,
        },
      },
    );

    if (updateProfileResult.matchedCount === 0) {
      return { ok: false, reason: "USER_NOT_FOUND" };
    }

    return {
      ok: true,
      userId: consumedToken.userId,
    };
  }
}
