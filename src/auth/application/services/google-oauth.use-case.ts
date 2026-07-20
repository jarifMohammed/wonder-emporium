import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { TOKEN_SIGNER_TOKEN } from '../../../common/domain/interfaces/token-signer.interface';
import type { ITokenSigner } from '../../../common/domain/interfaces/token-signer.interface';
import { APP_CONFIG_TOKEN } from '../../../common/domain/interfaces/app-config.interface';
import type { IAppConfig } from '../../../common/domain/interfaces/app-config.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { GoogleOAuthStrategy } from '../../infrastructure/oauth/google-oauth.strategy';
import { userRole } from '../../interfaces/auth.interface';
import type { AuthTokens, AuthUserOutput } from '../dto/auth.dto';
import { AuthUser } from '../../domain/entities/auth-user.entity';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class GoogleOAuthUseCase {
  constructor(
    private readonly googleStrategy: GoogleOAuthStrategy,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SIGNER_TOKEN)
    private readonly tokenSigner: ITokenSigner,
    @Inject(APP_CONFIG_TOKEN)
    private readonly config: IAppConfig,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async loginWithIdToken(
    idToken: string,
  ): Promise<{ tokens: AuthTokens; user: AuthUserOutput }> {
    const googleUser = await this.googleStrategy.verifyIdToken(idToken);

    let authUser = await this.userRepository.findByProvider(
      'google',
      googleUser.sub,
    );

    if (!authUser) {
      authUser = await this.userRepository.findByEmail(googleUser.email);
    }

    if (authUser) {
      return this.authenticateExistingUser(authUser);
    }

    return this.createGoogleUser(
      googleUser.email,
      googleUser.sub,
      googleUser.given_name,
      googleUser.family_name,
    );
  }

  private authenticateExistingUser(authUser: AuthUser): {
    tokens: AuthTokens;
    user: AuthUserOutput;
  } {
    if (!authUser.isActive()) {
      throw AppError.unauthorized('Account is not active');
    }

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
        createdAt: authUser.createdAt,
      },
    };
  }

  private async createGoogleUser(
    email: string,
    googleSub: string,
    firstName: string,
    lastName: string,
  ): Promise<{ tokens: AuthTokens; user: AuthUserOutput }> {
    const randomPass = Math.random().toString(36) + Math.random().toString(36);
    const tempPassword = await this.passwordHasher.hash(randomPass);
    const username = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const authUser = await this.userRepository.create({
      email,
      password: tempPassword,
      username,
      role: userRole.USER,
      provider: 'google',
      providerId: googleSub,
    });

    await this.userRepository.createProfile(
      authUser.id,
      firstName || email.split('@')[0],
      lastName || '',
    );
    await this.userRepository.createSecurity(authUser.id);

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
        verified: true,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        createdAt: authUser.createdAt,
      },
    };
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
      { expiresIn: '15m' },
    );
    const refreshToken = this.tokenSigner.sign(
      { sub: userId, email, role, tokenVersion, type: 'refresh' },
      this.config.jwt_refresh_secret,
      { expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }
}
