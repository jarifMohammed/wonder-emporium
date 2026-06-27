import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { OtpGenerator } from '../../infrastructure/security/otp-generator';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
    private readonly otpGenerator: OtpGenerator,
    private readonly emailService: EmailService,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    const otp = this.otpGenerator.generate(6);
    await this.otpStore.save(email, otp, 600);

    await this.emailService.sendPasswordResetEmail(email, user.username, otp);

    return { message: 'If the email exists, a reset code has been sent.' };
  }
}
