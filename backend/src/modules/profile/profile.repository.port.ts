export interface UserProfileDoc {
  _id: string;
  username: string;
  email?: string | null;
  passwordHash?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  avatarUpdatedAt?: Date | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatsDoc {
  userId: string;
  totalGames?: number | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  winRate?: number | null;
  updatedAt?: Date | null;
}

export interface UserRatingDoc {
  _id: string;
  mode?: string | null;
  rating?: number | null;
  peakRating?: number | null;
  updatedAt?: Date | null;
}

export interface LeaderboardQuery {
  page: number;
  pageSize: number;
  mode?: "ranked" | "room" | "bot" | "tournament";
  sort: "rating_desc" | "rating_asc" | "peak_desc" | "peak_asc";
  search?: string;
}

export interface LeaderboardEntryDoc {
  userId: string;
  username: string | null;
  displayName: string | null;
  rating: number;
  peakRating: number;
  updatedAt: Date | null;
}

export interface LeaderboardQueryResult {
  items: LeaderboardEntryDoc[];
  total: number;
  modeApplied: boolean;
}

export interface UserGamesQuery {
  page: number;
  pageSize: number;
  mode?: "ranked" | "room" | "bot" | "tournament";
  result?: "win" | "lose" | "draw";
  fromDate?: Date;
  toDate?: Date;
}

export interface UserGameDoc {
  gameId: string;
  mode: string | null;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteUsername?: string | null;
  blackUsername?: string | null;
  result: string | null;
  rawResult?: string | null;
  totalMoves?: number | null;
  createdAt: Date | null;
  finishedAt: Date | null;
}

export interface ReplayGameListItem {
  id: string;
  mode: string | null;
  result: string | null;
  createdAt: string | null;
  whitePlayer: {
    username: string;
  };
  blackPlayer: {
    username: string;
  };
  metadata: {
    totalMoves: number | null;
  };
}

export interface UserGamesQueryResult {
  items: UserGameDoc[];
  total: number;
}

export interface UserModeStatsResult {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface EmailVerificationTokenDoc {
  userId: string;
  purpose: "verify_email";
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  consumedAt?: Date;
}

export interface VerifyTokenResult {
  ok: boolean;
  reason?: "TOKEN_NOT_FOUND" | "TOKEN_EXPIRED" | "USER_NOT_FOUND";
  userId?: string;
}

export interface ProfileRepositoryPort {
  findUserProfileById(userId: string): Promise<UserProfileDoc | null>;
  findPasswordHashByUserId(userId: string): Promise<string | null>;
  updatePasswordHashByUserId(
    userId: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean>;
  updateUserAvatarById(
    userId: string,
    avatar: { avatarUrl: string; avatarPublicId: string | null; now: Date },
  ): Promise<UserProfileDoc | null>;
  findUserStatsByUserId(userId: string): Promise<UserStatsDoc | null>;
  findUserRatingByUserId(userId: string): Promise<UserRatingDoc | null>;
  updateUserProfileDisplayName(
    userId: string,
    displayName: string | null,
  ): Promise<UserProfileDoc | null>;
  findLeaderboard(query: LeaderboardQuery): Promise<LeaderboardQueryResult>;
  findUserGames(
    userId: string,
    query: UserGamesQuery,
  ): Promise<UserGamesQueryResult>;
  findUserModeStats(
    userId: string,
    mode?: "ranked" | "room" | "bot" | "tournament",
  ): Promise<UserModeStatsResult>;
  createEmailVerificationToken(token: EmailVerificationTokenDoc): Promise<void>;
  verifyEmailByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<VerifyTokenResult>;
}
