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
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { OtpGenerator } from '../../infrastructure/security/otp-generator';
import { EmailService } from '../../../common/services/email.service';

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
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
    private readonly otpGenerator: OtpGenerator,
    private readonly emailService: EmailService,
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

    // OTP storage is required for account verification. Persist it before
    // creating the user so a Redis outage cannot leave an unverifiable account.
    const verificationCode = this.otpGenerator.generate(6);
    await this.otpStore.save(
      `verification:${input.email}`,
      verificationCode,
      600,
    );

    const hashedPassword = await this.passwordHasher.hash(input.password);
    const username = this.generateUsername(input.email);

    let isFoundingAuthor = false;
    if (input.role === userRole.AUTHOR) {
      const authorCount = await this.userRepository.countByRole(
        userRole.AUTHOR,
      );
      if (authorCount < 100) {
        isFoundingAuthor = true;
      }
    }

    const authUser = await this.userRepository.create({
      email: input.email,
      password: hashedPassword,
      username,
      role: input.role,
      status: input.role === userRole.AUTHOR ? 'INACTIVE' : 'ACTIVE',
      isFoundingAuthor,
    });

    await this.userRepository.createProfile(
      authUser.id,
      input.firstName,
      input.lastName,
    );
    await this.userRepository.createSecurity(authUser.id);

    // Do not hold the registration response open while SMTP completes. The OTP
    // is already persisted, so the user can continue to verification and use
    // the resend endpoint if delivery fails.
    void this.sendRegistrationEmails({
      authUser,
      verificationCode,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const tokens = this.generateTokens(
      authUser.id,
      authUser.email,
      authUser.role,
      authUser.tokenVersion,
    );

    if (isFoundingAuthor) {
      // TODO: Send greetings email to the founding author
      // This could be dispatched via an event emitter or a mail service
      console.log(
        `[Email Mock] Sending Greetings to Founding Author: ${authUser.email}`,
      );
    }

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

  private async sendRegistrationEmails(input: {
    authUser: {
      id: string;
      email: string;
      username: string;
      role: userRole;
    };
    verificationCode: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    const emails: Promise<void>[] = [
      this.emailService.sendVerificationEmail(
        input.authUser.email,
        input.authUser.username,
        input.verificationCode,
      ),
    ];

    if (input.authUser.role === userRole.AUTHOR) {
      emails.push(
        this.emailService.sendAuthorPendingApprovalEmail(
          input.authUser.email,
          input.authUser.username,
        ),
        this.emailService.sendNewAuthorAdminNotificationEmail({
          authorId: input.authUser.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.authUser.email,
        }),
      );
    }

    const results = await Promise.allSettled(emails);
    const failedCount = results.filter(
      (result) => result.status === 'rejected',
    ).length;
    if (failedCount > 0) {
      console.error(
        `Failed to deliver ${failedCount} registration email(s) for ${input.authUser.email}`,
      );
    }
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
