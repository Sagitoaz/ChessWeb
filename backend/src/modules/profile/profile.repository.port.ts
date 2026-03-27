export interface UserProfileDoc {
  _id: string
  username: string
  displayName?: string | null
  isActive?: boolean | null
  isVerified?: boolean | null
  createdAt: Date
  updatedAt: Date
}

export interface EmailVerificationTokenDoc {
  userId: string
  purpose: 'verify_email'
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  consumedAt?: Date
}

export interface VerifyTokenResult {
  ok: boolean
  reason?: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND'
  userId?: string
}

export interface ProfileRepositoryPort {
  findUserProfileById(userId: string): Promise<UserProfileDoc | null>
  updateUserProfileDisplayName(userId: string, displayName: string | null): Promise<UserProfileDoc | null>
  createEmailVerificationToken(token: EmailVerificationTokenDoc): Promise<void>
  verifyEmailByTokenHash(tokenHash: string, now: Date): Promise<VerifyTokenResult>
}
