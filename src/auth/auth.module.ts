import { Module } from '@nestjs/common';

import { AuthController } from './presentation/controllers/auth.controller';
import { AdminUsersController } from './presentation/controllers/admin-users.controller';

import { AccessTokenAuthenticator } from './application/services/access-token-authenticator.service';
import { CreateAccountUseCase } from './application/services/create-account.use-case';
import { LoginUseCase } from './application/services/login.use-case';
import { ForgotPasswordUseCase } from './application/services/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/services/reset-password.use-case';
import { ChangePasswordUseCase } from './application/services/change-password.use-case';
import { RefreshTokenUseCase } from './application/services/refresh-token.use-case';
import { VerifyEmailUseCase } from './application/services/verify-email.use-case';
import { GoogleOAuthUseCase } from './application/services/google-oauth.use-case';
import { UpdateUserStatusUseCase } from './application/services/update-user-status.use-case';
import { ResendVerificationUseCase } from './application/services/resend-verification.use-case';
import { GetAdminAuthorsUseCase } from './application/services/get-admin-authors.use-case';
import { VerifyPasswordResetOtpUseCase } from './application/services/verify-password-reset-otp.use-case';

import { PrismaAuthUserRepository } from './infrastructure/persistence/prisma-auth-user.repository';
import { PrismaOtpStore } from './infrastructure/persistence/prisma-otp.store';
import { GoogleOAuthStrategy } from './infrastructure/oauth/google-oauth.strategy';
import { OtpGenerator } from './infrastructure/security/otp-generator';

import { BcryptPasswordHasher } from '../common/infrastructure/security/bcrypt-password-hasher';
import { JsonWebTokenSigner } from '../common/infrastructure/security/jsonwebtoken-token-signer';
import { EmailService } from '../common/services/email.service';

import { PASSWORD_HASHER_TOKEN } from '../common/domain/interfaces/password-hasher.interface';
import { TOKEN_SIGNER_TOKEN } from '../common/domain/interfaces/token-signer.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from './domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from './domain/interfaces/otp-store.interface';
import { APP_CONFIG_TOKEN } from '../common/domain/interfaces/app-config.interface';
import { AppConfigService } from '../common/config/app-config.service';

@Module({
  imports: [],
  controllers: [AuthController, AdminUsersController],
  providers: [
    // Domain interfaces → Infrastructure implementations
    {
      provide: PASSWORD_HASHER_TOKEN,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SIGNER_TOKEN,
      useClass: JsonWebTokenSigner,
    },
    {
      provide: AUTH_USER_REPOSITORY_TOKEN,
      useClass: PrismaAuthUserRepository,
    },
    {
      provide: OTP_STORE_TOKEN,
      useClass: PrismaOtpStore,
    },
    {
      provide: APP_CONFIG_TOKEN,
      useExisting: AppConfigService,
    },

    // Application use cases
    AccessTokenAuthenticator,
    CreateAccountUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    RefreshTokenUseCase,
    VerifyEmailUseCase,
    GoogleOAuthUseCase,
    UpdateUserStatusUseCase,
    ResendVerificationUseCase,
    GetAdminAuthorsUseCase,
    VerifyPasswordResetOtpUseCase,

    // Infrastructure
    PrismaAuthUserRepository,
    PrismaOtpStore,
    GoogleOAuthStrategy,
    OtpGenerator,
    EmailService,
  ],
  exports: [AccessTokenAuthenticator, AUTH_USER_REPOSITORY_TOKEN],
})
export class AuthModule {}
