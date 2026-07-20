import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
  ) {}

  async execute(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const otpKey = `password-reset:${email}`;
    const valid = await this.otpStore.verify(otpKey, otp);
    if (!valid) {
      throw AppError.badRequest('Invalid or expired OTP');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword);

    await this.userRepository.updatePassword(user.id, hashedPassword);
    await this.userRepository.incrementTokenVersion(user.id);
    await this.userRepository.updateSecurity(user.id, {
      lastPasswordChange: new Date(),
    });
    await this.otpStore.delete(otpKey);

    return { message: 'Password reset successfully' };
  }
}
