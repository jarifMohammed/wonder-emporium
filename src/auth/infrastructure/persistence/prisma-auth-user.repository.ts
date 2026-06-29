import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IAuthUserRepository,
  AuthSecurityData,
} from '../../domain/interfaces/auth-user.repository.interface';
import { CreateAuthUserData } from '../../domain/interfaces/auth-user.repository.interface';
import { AuthUser } from '../../domain/entities/auth-user.entity';
import { userRole } from '../../interfaces/auth.interface';

interface PrismaAuthUser {
  id: string;
  email: string;
  password: string;
  username: string;
  role: string;
  verified: boolean;
  status: string;
  tokenVersion: number;
  provider: string;
  providerId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isFoundingAuthor: boolean;
}

@Injectable()
export class PrismaAuthUserRepository implements IAuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.authUser.findUnique({ where: { id } });
    return user ? this.toDomain(user as PrismaAuthUser) : null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.authUser.findUnique({ where: { email } });
    return user ? this.toDomain(user as PrismaAuthUser) : null;
  }

  async countByRole(role: userRole): Promise<number> {
    return this.prisma.authUser.count({ where: { role: role as $Enums.UserRole } });
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<AuthUser | null> {
    const user = await this.prisma.authUser.findFirst({
      where: { provider, providerId },
    });
    return user ? this.toDomain(user as PrismaAuthUser) : null;
  }

  async create(data: CreateAuthUserData): Promise<AuthUser> {
    const user = await this.prisma.authUser.create({
      data: {
        email: data.email,
        password: data.password,
        username: data.username,
        role: data.role as $Enums.UserRole,
        status: (data.status as $Enums.UserStatus) ?? $Enums.UserStatus.ACTIVE,
        provider: data.provider ?? 'local',
        providerId: data.providerId,
        isFoundingAuthor: data.isFoundingAuthor ?? false,
      },
    });
    return this.toDomain(user as PrismaAuthUser);
  }

  async update(id: string, data: Partial<AuthUser>): Promise<AuthUser> {
    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.role !== undefined) updateData.role = data.role as string;
    if (data.verified !== undefined) updateData.verified = data.verified;
    if (data.status !== undefined) updateData.status = data.status as string;

    const user = await this.prisma.authUser.update({
      where: { id },
      data: updateData,
    });
    return this.toDomain(user as PrismaAuthUser);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.prisma.authUser.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.prisma.authUser.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.authUser.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
  }

  async createProfile(
    authId: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    await this.prisma.userProfile.create({
      data: { authId, firstName, lastName },
    });
  }

  async findSecurityByAuthId(authId: string): Promise<AuthSecurityData | null> {
    const security = await this.prisma.authSecurity.findUnique({
      where: { authId },
    });
    if (!security) return null;
    return {
      authId: security.authId,
      failedAttempts: security.failedAttempts,
      lastFailedAt: security.lastFailedAt,
      lockExpiresAt: security.lockExpiresAt,
      lastPasswordChange: security.lastPasswordChange,
    };
  }

  async createSecurity(authId: string): Promise<void> {
    await this.prisma.authSecurity.create({
      data: { authId },
    });
  }

  async updateSecurity(
    authId: string,
    data: Partial<AuthSecurityData>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.failedAttempts !== undefined)
      updateData.failedAttempts = data.failedAttempts;
    if (data.lastFailedAt !== undefined)
      updateData.lastFailedAt = data.lastFailedAt;
    if (data.lockExpiresAt !== undefined)
      updateData.lockExpiresAt = data.lockExpiresAt;
    if (data.lastPasswordChange !== undefined)
      updateData.lastPasswordChange = data.lastPasswordChange;

    await this.prisma.authSecurity.update({
      where: { authId },
      data: updateData,
    });
  }

  async recordLoginHistory(
    authId: string,
    data: {
      ipAddress: string;
      userAgent: string;
      action: string;
      success: boolean;
      failureReason?: string;
    },
  ): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        authId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        action: data.action as $Enums.LoginAction,
        success: data.success,
        failureReason: data.failureReason,
      },
    });
  }

  private toDomain(user: PrismaAuthUser): AuthUser {
    return new AuthUser(
      user.id,
      user.email,
      user.password,
      user.username,
      user.role as userRole,
      user.verified,
      user.status,
      user.tokenVersion,
      user.provider,
      user.providerId,
      user.createdAt,
      user.updatedAt,
      user.deletedAt,
      user.isFoundingAuthor,
    );
  }
}
