import { Inject, Injectable } from '@nestjs/common';
import { OTP_STORE_TOKEN } from '../../domain/interfaces/otp-store.interface';
import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class VerifyPasswordResetOtpUseCase {
  constructor(
    @Inject(OTP_STORE_TOKEN)
    private readonly otpStore: IOtpStore,
  ) {}

  async execute(email: string, otp: string): Promise<{ message: string }> {
    const valid = await this.otpStore.verify(`password-reset:${email}`, otp);
    if (!valid) throw AppError.badRequest('Invalid or expired OTP');
    return { message: 'OTP verified successfully' };
  }
}
