import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/services/redis.service';
import { AppError } from '../../../common/errors/app.error';
import { IOtpStore } from '../../domain/interfaces/otp-store.interface';

@Injectable()
export class PrismaOtpStore implements IOtpStore {
  private readonly prefix = 'otp:';

  constructor(private readonly redis: RedisService) {}

  async save(email: string, otp: string, ttlSeconds: number): Promise<void> {
    const saved = await this.redis.set(
      `${this.prefix}${email}`,
      otp,
      ttlSeconds,
    );
    if (!saved) {
      throw AppError.serviceUnavailable(
        'OTP service is unavailable. Please try again shortly.',
      );
    }
  }

  async verify(email: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get<string>(`${this.prefix}${email}`);
    return stored === otp;
  }

  async delete(email: string): Promise<void> {
    await this.redis.del(`${this.prefix}${email}`);
  }
}
