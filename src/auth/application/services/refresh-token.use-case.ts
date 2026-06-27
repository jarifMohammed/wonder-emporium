import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TOKEN_SIGNER_TOKEN } from '../../../common/domain/interfaces/token-signer.interface';
import type { ITokenSigner } from '../../../common/domain/interfaces/token-signer.interface';
import { APP_CONFIG_TOKEN } from '../../../common/domain/interfaces/app-config.interface';
import type { IAppConfig } from '../../../common/domain/interfaces/app-config.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import type { JwtPayload } from '../../interfaces/auth.interface';
import type { AuthTokens } from '../dto/auth.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_SIGNER_TOKEN)
    private readonly tokenSigner: ITokenSigner,
    @Inject(APP_CONFIG_TOKEN)
    private readonly config: IAppConfig,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.tokenSigner.verify<JwtPayload>(
        refreshToken,
        this.config.jwt_refresh_secret,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const accessToken = this.tokenSigner.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
        type: 'access',
      },
      this.config.jwt_access_secret,
      { expiresIn: '15m' },
    );

    const newRefreshToken = this.tokenSigner.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
        type: 'refresh',
      },
      this.config.jwt_refresh_secret,
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken: newRefreshToken };
  }
}
