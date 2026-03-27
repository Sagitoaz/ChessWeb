import { Injectable } from '@nestjs/common'
import { Collection } from 'mongodb'
import { MongoService } from '../../shared/db/mongo.service'
import {
  EmailVerificationTokenDoc,
  ProfileRepositoryPort,
  UserProfileDoc,
  VerifyTokenResult,
} from './profile.repository.port'

@Injectable()
export class ProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly mongoService: MongoService) {}

  private userProfiles(): Collection<UserProfileDoc> {
    return this.mongoService.getDb().collection<UserProfileDoc>('user_profiles')
  }

  private emailVerificationTokens(): Collection<EmailVerificationTokenDoc> {
    return this.mongoService.getDb().collection<EmailVerificationTokenDoc>('email_verification_tokens')
  }

  async findUserProfileById(userId: string): Promise<UserProfileDoc | null> {
    return this.userProfiles().findOne({ _id: userId })
  }

  async updateUserProfileDisplayName(userId: string, displayName: string | null): Promise<UserProfileDoc | null> {
    const now = new Date()
    const result = await this.userProfiles().findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          displayName,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    )

    return result
  }

  async createEmailVerificationToken(token: EmailVerificationTokenDoc): Promise<void> {
    await this.emailVerificationTokens().insertOne(token)
  }

  async verifyEmailByTokenHash(tokenHash: string, now: Date): Promise<VerifyTokenResult> {
    const token = await this.emailVerificationTokens().findOne({
      tokenHash,
      purpose: 'verify_email',
      consumedAt: { $exists: false },
    })

    if (!token) {
      return { ok: false, reason: 'TOKEN_NOT_FOUND' }
    }

    if (token.expiresAt <= now) {
      return { ok: false, reason: 'TOKEN_EXPIRED' }
    }

    const profile = await this.userProfiles().findOne({ _id: token.userId })
    if (!profile) {
      return { ok: false, reason: 'USER_NOT_FOUND' }
    }

    await this.emailVerificationTokens().updateOne(
      { tokenHash: token.tokenHash },
      {
        $set: {
          consumedAt: now,
        },
      }
    )

    await this.userProfiles().updateOne(
      { _id: token.userId },
      {
        $set: {
          isVerified: true,
          updatedAt: now,
        },
      }
    )

    return {
      ok: true,
      userId: token.userId,
    }
  }
}
