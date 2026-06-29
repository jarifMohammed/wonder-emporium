import type { userRole } from '../../interfaces/auth.interface';
import { AuthUser } from '../entities/auth-user.entity';

export interface CreateAuthUserData {
  email: string;
  password: string;
  username: string;
  role: userRole;
  provider?: string;
  providerId?: string;
  isFoundingAuthor?: boolean;
}

export interface IAuthUserRepository {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  countByRole(role: userRole): Promise<number>;
  findByProvider(
    provider: string,
    providerId: string,
  ): Promise<AuthUser | null>;
  create(data: CreateAuthUserData): Promise<AuthUser>;
  update(id: string, data: Partial<AuthUser>): Promise<AuthUser>;
  updatePassword(id: string, hashedPassword: string): Promise<void>;
  incrementTokenVersion(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;

  createProfile(
    authId: string,
    firstName: string,
    lastName: string,
  ): Promise<void>;
  findSecurityByAuthId(authId: string): Promise<AuthSecurityData | null>;
  createSecurity(authId: string): Promise<void>;
  updateSecurity(
    authId: string,
    data: Partial<AuthSecurityData>,
  ): Promise<void>;
  recordLoginHistory(
    authId: string,
    data: {
      ipAddress: string;
      userAgent: string;
      action: string;
      success: boolean;
      failureReason?: string;
    },
  ): Promise<void>;
}

export interface AuthSecurityData {
  authId: string;
  failedAttempts: number;
  lastFailedAt: Date | null;
  lockExpiresAt: Date | null;
  lastPasswordChange: Date | null;
}

export const AUTH_USER_REPOSITORY_TOKEN = Symbol('IAuthUserRepository');
