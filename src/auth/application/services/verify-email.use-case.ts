import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { AppError } from '../../../common/errors/app.error';
import { AuthUser } from '../../domain/entities/auth-user.entity';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
  ) {}

  async execute(email: string, code: string): Promise<{ message: string }> {
    const otpKey = `verification:${email}`;
    const valid = await this.otpStore.verify(otpKey, code);
    if (!valid) {
      throw AppError.badRequest('Invalid or expired verification code');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.isVerified()) {
      return { message: 'Email already verified' };
    }

    await this.userRepository.update(user.id, {
      verified: true,
    } as Partial<AuthUser>);
    await this.otpStore.delete(otpKey);

    return { message: 'Email verified successfully' };
  }
}
