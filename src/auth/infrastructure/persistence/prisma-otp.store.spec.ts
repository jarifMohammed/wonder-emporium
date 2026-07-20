import { PrismaOtpStore } from './prisma-otp.store';
import type { RedisService } from '../../../common/services/redis.service';

describe('PrismaOtpStore', () => {
  const redis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;

  const store = new PrismaOtpStore(redis);

  beforeEach(() => jest.clearAllMocks());

  it('stores namespaced OTP data with its TTL', async () => {
    redis.set.mockResolvedValue(true);

    await store.save('verification:user@example.com', '123456', 600);

    expect(redis.set).toHaveBeenCalledWith(
      'otp:verification:user@example.com',
      '123456',
      600,
    );
  });

  it('fails instead of silently continuing when Redis cannot store the OTP', async () => {
    redis.set.mockResolvedValue(false);

    await expect(
      store.save('verification:user@example.com', '123456', 600),
    ).rejects.toMatchObject({
      message: 'OTP service is unavailable. Please try again shortly.',
    });
  });
});
