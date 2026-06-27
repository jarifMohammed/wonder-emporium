import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TOKEN_SIGNER_TOKEN } from '../../../common/domain/interfaces/token-signer.interface';
import type { ITokenSigner } from '../../../common/domain/interfaces/token-signer.interface';
import { APP_CONFIG_TOKEN } from '../../../common/domain/interfaces/app-config.interface';
import type { IAppConfig } from '../../../common/domain/interfaces/app-config.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import type {
  AuthPrincipal,
  JwtPayload,
} from '../../interfaces/auth.interface';

@Injectable()
export class AccessTokenAuthenticator {
  constructor(
    @Inject(TOKEN_SIGNER_TOKEN)
    private readonly tokenSigner: ITokenSigner,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(APP_CONFIG_TOKEN)
    private readonly config: IAppConfig,
  ) {}

  async authenticate(token: string): Promise<AuthPrincipal> {
    let payload: JwtPayload;
    try {
      payload = this.tokenSigner.verify<JwtPayload>(
        token,
        this.config.jwt_access_secret,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }
}
