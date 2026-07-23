import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { TOKEN_SIGNER_TOKEN } from '../../../common/domain/interfaces/token-signer.interface';
import type { ITokenSigner } from '../../../common/domain/interfaces/token-signer.interface';
import { APP_CONFIG_TOKEN } from '../../../common/domain/interfaces/app-config.interface';
import type { IAppConfig } from '../../../common/domain/interfaces/app-config.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type {
  IAuthUserRepository,
  AuthSecurityData,
} from '../../domain/interfaces/auth-user.repository.interface';
import { userRole } from '../../interfaces/auth.interface';
import { AppError } from '../../../common/errors/app.error';
import type { AuthTokens, AuthUserOutput } from '../dto/auth.dto';

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LoginUseCase {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;

  constructor(
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SIGNER_TOKEN)
    private readonly tokenSigner: ITokenSigner,
    @Inject(APP_CONFIG_TOKEN)
    private readonly config: IAppConfig,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(
    input: LoginInput,
  ): Promise<{ tokens: AuthTokens; user: AuthUserOutput }> {
    const authUser = await this.userRepository.findByEmail(input.email);
    if (!authUser) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!authUser.isActive()) {
      throw AppError.unauthorized('Account is not active');
    }

    if (!authUser.isVerified()) {
      throw AppError.unauthorized('Email is not verified');
    }

    const security = await this.userRepository.findSecurityByAuthId(
      authUser.id,
    );
    if (security?.lockExpiresAt && security.lockExpiresAt > new Date()) {
      throw AppError.unauthorized(
        'Account is temporarily locked. Please try again later.',
      );
    }

    const passwordValid = await this.passwordHasher.compare(
      input.password,
      authUser.password,
    );

    if (!passwordValid) {
      await this.handleFailedAttempt(authUser.id, security, input);
      throw AppError.unauthorized('Invalid email or password');
    }

    await this.handleSuccessfulAuth(authUser.id, security, input);

    const tokens = this.generateTokens(
      authUser.id,
      authUser.email,
      authUser.role,
      authUser.tokenVersion,
    );

    return {
      tokens,
      user: {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        role: authUser.role,
        verified: authUser.verified,
        isFoundingAuthor: authUser.isFoundingAuthor,
        createdAt: authUser.createdAt,
      },
    };
  }

  private async handleFailedAttempt(
    userId: string,
    security: AuthSecurityData | null,
    input: LoginInput,
  ): Promise<void> {
    const attempts = (security?.failedAttempts ?? 0) + 1;
    const now = new Date();

    const updateData: Partial<AuthSecurityData> = {
      failedAttempts: attempts,
      lastFailedAt: now,
    };

    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      updateData.lockExpiresAt = new Date(
        now.getTime() + this.LOCK_DURATION_MINUTES * 60 * 1000,
      );
    }

    await this.userRepository.updateSecurity(userId, updateData);

    await this.userRepository.recordLoginHistory(userId, {
      ipAddress: input.ipAddress ?? 'unknown',
      userAgent: input.userAgent ?? 'unknown',
      action: 'login',
      success: false,
      failureReason: 'Invalid password',
    });
  }

  private async handleSuccessfulAuth(
    userId: string,
    security: AuthSecurityData | null,
    input: LoginInput,
  ): Promise<void> {
    if (security) {
      await this.userRepository.updateSecurity(userId, {
        failedAttempts: 0,
        lastFailedAt: null,
        lockExpiresAt: null,
      });
    }

    await this.userRepository.recordLoginHistory(userId, {
      ipAddress: input.ipAddress ?? 'unknown',
      userAgent: input.userAgent ?? 'unknown',
      action: 'login',
      success: true,
    });
  }

  private generateTokens(
    userId: string,
    email: string,
    role: userRole,
    tokenVersion: number,
  ): AuthTokens {
    const accessToken = this.tokenSigner.sign(
      { sub: userId, email, role, tokenVersion, type: 'access' },
      this.config.jwt_access_secret,
      { expiresIn: '10d' },
    );
    const refreshToken = this.tokenSigner.sign(
      { sub: userId, email, role, tokenVersion, type: 'refresh' },
      this.config.jwt_refresh_secret,
      { expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }
}
