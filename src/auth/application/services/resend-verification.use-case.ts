import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { OtpGenerator } from '../../infrastructure/security/otp-generator';
import { EMAIL_SENDER_TOKEN } from '../../../common/domain/interfaces/email-sender.interface';
import type { IEmailSender } from '../../../common/domain/interfaces/email-sender.interface';

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
    private readonly otpGenerator: OtpGenerator,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.isVerified()) {
      return { message: 'If verification is required, a code has been sent.' };
    }

    const code = this.otpGenerator.generate(6);
    await this.otpStore.save(`verification:${email}`, code, 600);
    await this.emailSender.sendVerificationEmail(
      email,
      user.username,
      code,
      user.id,
    );
    return { message: 'If verification is required, a code has been sent.' };
  }
}
