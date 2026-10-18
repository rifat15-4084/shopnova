import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { User, type UserDoc } from '../models/User.js';
import { ApiError } from '../utils/errors.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
  type AccessTokenPayload,
} from './token.service.js';
import { mailService } from './mail.service.js';

const BCRYPT_ROUNDS = 12;
const MAX_REFRESH_TOKENS = 5;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  addresses: unknown[];
  wishlist: unknown[];
  isActive: boolean;
  createdAt?: Date;
}

export function toPublicUser(user: UserDoc & { _id: Types.ObjectId }): PublicUser {
  const obj = user.toJSON ? (user.toJSON() as Record<string, unknown>) : (user as any);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    addresses: (obj.addresses as unknown[]) ?? [],
    wishlist: ((user.wishlist as unknown[]) ?? []).map(String),
    isActive: user.isActive,
    createdAt: (obj.createdAt as Date) ?? undefined,
  };
}

async function issueTokens(user: UserDoc & { _id: Types.ObjectId }): Promise<AuthTokens> {
  const payload: AccessTokenPayload = {
    sub: String(user._id),
    role: user.role,
    name: user.name,
  };
  const accessToken = signAccessToken(payload);
  const { token: refreshToken, hash } = generateRefreshToken();

  user.refreshTokens = [hash, ...((user.refreshTokens as string[]) ?? [])].slice(
    0,
    MAX_REFRESH_TOKENS,
  );
  await user.save();

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    });
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login(input: { email: string; password: string }, context: { ip?: string } = {}) {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select(
      '+passwordHash +refreshTokens',
    );
    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    user.lastLoginAt = new Date();
    const tokens = await issueTokens(user);
    void context;
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
    const hash = hashRefreshToken(refreshToken);
    const user = await User.findOne({ refreshTokens: hash }).select('+refreshTokens');
    if (!user) throw ApiError.unauthorized('Invalid or expired refresh token');
    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

    // Rotate: drop the used token, issue a new pair
    user.refreshTokens = ((user.refreshTokens as string[]) ?? []).filter((t) => t !== hash);
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout(refreshToken: string | null) {
    if (!refreshToken) return;
    const hash = hashRefreshToken(refreshToken);
    await User.updateOne({ refreshTokens: hash }, { $pull: { refreshTokens: hash } });
  },

  async logoutAll(userId: string) {
    await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
  },

  async me(userId: string) {
    const user = await User.findById(userId).populate('wishlist', 'title slug price images');
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user as UserDoc & { _id: Types.ObjectId });
  },

  async updateProfile(userId: string, patch: { name?: string; email?: string }) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (patch.email && patch.email.toLowerCase() !== user.email) {
      const clash = await User.findOne({ email: patch.email.toLowerCase() });
      if (clash) throw ApiError.conflict('An account with this email already exists');
      user.email = patch.email.toLowerCase();
    }
    if (patch.name) user.name = patch.name;
    await user.save();
    return toPublicUser(user as UserDoc & { _id: Types.ObjectId });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    user.refreshTokens = [];
    await user.save();
  },

  async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    // Do not leak account existence
    if (!user) return { sent: true };
    const token = signPasswordResetToken(String(user._id));
    // Store only a marker; token is stateless JWT with 1h expiry
    await User.updateOne(
      { _id: user._id },
      { $set: { resetPasswordTokenHash: hashRefreshToken(token), resetPasswordExpires: new Date(Date.now() + 3600_000) } },
    );
    await mailService.sendPasswordReset(user.email, user.name, token, new Date(Date.now() + 3600_000));
    return { sent: true };
  },

  async resetPassword(token: string, newPassword: string) {
    let userId: string;
    try {
      userId = verifyPasswordResetToken(token);
    } catch {
      throw ApiError.badRequest('Invalid or expired reset token');
    }
    const user = await User.findById(userId).select('+resetPasswordTokenHash +resetPasswordExpires');
    if (!user) throw ApiError.badRequest('Invalid or expired reset token');
    if (
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now() ||
      user.resetPasswordTokenHash !== hashRefreshToken(token)
    ) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    user.resetPasswordTokenHash = undefined as unknown as string;
    user.resetPasswordExpires = undefined as unknown as Date;
    user.refreshTokens = [];
    await user.save();
    await mailService.send({
      to: user.email,
      subject: 'Your ShopNova password was changed',
      text: `Hi ${user.name},\n\nYour password was just changed. If this wasn't you, reset it immediately.`,
    });
  },
};
