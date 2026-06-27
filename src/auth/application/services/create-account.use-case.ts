import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { TOKEN_SIGNER_TOKEN } from '../../../common/domain/interfaces/token-signer.interface';
import type { ITokenSigner } from '../../../common/domain/interfaces/token-signer.interface';
import { APP_CONFIG_TOKEN } from '../../../common/domain/interfaces/app-config.interface';
import type { IAppConfig } from '../../../common/domain/interfaces/app-config.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { userRole } from '../../interfaces/auth.interface';
import { AppError } from '../../../common/errors/app.error';
import type { AuthTokens, AuthUserOutput } from '../dto/auth.dto';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: userRole;
}

@Injectable()
export class CreateAccountUseCase {
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
    input: RegisterInput,
  ): Promise<{ tokens: AuthTokens; user: AuthUserOutput }> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('Email already registered');
    }

    const validRoles: userRole[] = [
      userRole.READER,
      userRole.AUTHOR,
      userRole.USER,
    ];
    if (!validRoles.includes(input.role)) {
      throw AppError.badRequest('Role must be READER or AUTHOR');
    }

    const hashedPassword = await this.passwordHasher.hash(input.password);
    const username = this.generateUsername(input.email);

    const authUser = await this.userRepository.create({
      email: input.email,
      password: hashedPassword,
      username,
      role: input.role,
    });

    await this.userRepository.createProfile(
      authUser.id,
      input.firstName,
      input.lastName,
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
        verified: authUser.verified,
        firstName: input.firstName,
        lastName: input.lastName,
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

  private generateUsername(email: string): string {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}_${suffix}`;
  }
}
