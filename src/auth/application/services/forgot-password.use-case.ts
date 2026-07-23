import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { OtpGenerator } from '../../infrastructure/security/otp-generator';
import { EMAIL_SENDER_TOKEN } from '../../../common/domain/interfaces/email-sender.interface';
import type { IEmailSender } from '../../../common/domain/interfaces/email-sender.interface';

@Injectable()
export class ForgotPasswordUseCase {
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
    if (!user) {
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    const otp = this.otpGenerator.generate(6);
    await this.otpStore.save(`password-reset:${email}`, otp, 600);

    await this.emailSender.sendPasswordResetEmail(email, user.username, otp);

    return { message: 'If the email exists, a reset code has been sent.' };
  }
}
