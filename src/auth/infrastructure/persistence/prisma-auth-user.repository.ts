import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IAuthUserRepository,
  AuthSecurityData,
  AdminAuthorFilters,
  AdminAuthorRecord,
  PaginatedAdminAuthors,
  UserProfileData,
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
    return this.prisma.authUser.count({
      where: { role: role as $Enums.UserRole },
    });
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
    if (data.status !== undefined) updateData.status = data.status;

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

  async updateProfile(
    authId: string,
    data: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatarUrl?: string;
      coverImageUrl?: string;
      websiteUrl?: string;
      twitterUrl?: string;
      instagramUrl?: string;
      linkedinUrl?: string;
      location?: string;
    },
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.twitterUrl !== undefined) updateData.twitterUrl = data.twitterUrl;
    if (data.instagramUrl !== undefined) updateData.instagramUrl = data.instagramUrl;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
    if (data.location !== undefined) updateData.location = data.location;

    await this.prisma.userProfile.update({
      where: { authId },
      data: updateData,
    });
  }

  async findProfileByAuthId(authId: string): Promise<UserProfileData | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { authId },
    });
    if (!profile) return null;
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      websiteUrl: profile.websiteUrl,
      twitterUrl: profile.twitterUrl,
      instagramUrl: profile.instagramUrl,
      linkedinUrl: profile.linkedinUrl,
      location: profile.location,
    };
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

  async findAuthors(
    filters: AdminAuthorFilters,
  ): Promise<PaginatedAdminAuthors> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      role: $Enums.UserRole.AUTHOR,
      deletedAt: null,
      ...(filters.status
        ? { status: filters.status as $Enums.UserStatus }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                email: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                username: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                userProfile: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: filters.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        lastName: {
                          contains: filters.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [authors, total] = await Promise.all([
      this.prisma.authUser.findMany({
        where,
        include: { userProfile: true, _count: { select: { books: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.authUser.count({ where }),
    ]);

    return {
      authors: authors.map((author) => this.toAdminAuthor(author)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAuthorDetails(id: string): Promise<AdminAuthorRecord | null> {
    const author = await this.prisma.authUser.findFirst({
      where: { id, role: $Enums.UserRole.AUTHOR, deletedAt: null },
      include: { userProfile: true, _count: { select: { books: true } } },
    });
    return author ? this.toAdminAuthor(author) : null;
  }

  async findFoundingAuthors(filters?: { page?: number; limit?: number }): Promise<any> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const where = {
      isFoundingAuthor: true,
      role: $Enums.UserRole.AUTHOR,
      deletedAt: null,
      status: $Enums.UserStatus.ACTIVE,
    };

    const [authors, total] = await Promise.all([
      this.prisma.authUser.findMany({
        where,
        include: { 
          userProfile: true, 
          books: {
            select: {
              category: true
            },
            where: {
              status: $Enums.BookStatus.APPROVED
            }
          },
          _count: { select: { books: true } } 
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.authUser.count({ where }),
    ]);

    return {
      authors: authors.map((author) => this.toFoundingAuthor(author)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFoundingAuthorById(id: string): Promise<any> {
    const author = await this.prisma.authUser.findFirst({
      where: { id, isFoundingAuthor: true, role: $Enums.UserRole.AUTHOR, deletedAt: null, status: $Enums.UserStatus.ACTIVE },
      include: { 
        userProfile: true, 
        books: {
          select: {
            category: true
          },
          where: {
            status: $Enums.BookStatus.APPROVED
          }
        },
        _count: { select: { books: true } } 
      },
    });
    return author ? this.toFoundingAuthor(author) : null;
  }

  private toFoundingAuthor(author: any): any {
    // Get unique categories from approved books
    const categories = [...new Set(
      author.books
        .map((book: any) => book.category)
        .filter((cat: any) => cat !== null && cat !== undefined)
    )];

    return {
      id: author.id,
      username: author.username,
      isFoundingAuthor: author.isFoundingAuthor,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
      profile: author.userProfile
        ? {
            firstName: author.userProfile.firstName,
            lastName: author.userProfile.lastName,
            bio: author.userProfile.bio,
            avatarUrl: author.userProfile.avatarUrl,
            coverImageUrl: author.userProfile.coverImageUrl ?? null,
            websiteUrl: author.userProfile.websiteUrl ?? null,
            twitterUrl: author.userProfile.twitterUrl ?? null,
            instagramUrl: author.userProfile.instagramUrl ?? null,
            linkedinUrl: author.userProfile.linkedinUrl ?? null,
            location: author.userProfile.location ?? null,
          }
        : null,
      bookCount: author._count.books,
      categories,
    };
  }

  private toAdminAuthor(author: any): AdminAuthorRecord {
    return {
      id: author.id,
      email: author.email,
      username: author.username,
      role: author.role as userRole,
      verified: author.verified,
      status: author.status,
      isFoundingAuthor: author.isFoundingAuthor,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
      profile: author.userProfile
        ? {
            firstName: author.userProfile.firstName,
            lastName: author.userProfile.lastName,
            bio: author.userProfile.bio,
            avatarUrl: author.userProfile.avatarUrl,
            location: author.userProfile.location ?? null,
          }
        : null,
      bookCount: author._count.books,
    };
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
