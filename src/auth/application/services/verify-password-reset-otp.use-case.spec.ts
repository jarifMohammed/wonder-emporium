import type { IOtpStore } from '../../domain/interfaces/otp-store.interface';
import { VerifyPasswordResetOtpUseCase } from './verify-password-reset-otp.use-case';

describe('VerifyPasswordResetOtpUseCase', () => {
  const otpStore: jest.Mocked<IOtpStore> = {
    save: jest.fn(),
    verify: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new VerifyPasswordResetOtpUseCase(otpStore);

  beforeEach(() => jest.clearAllMocks());

  it('verifies against the password-reset namespace without consuming the OTP', async () => {
    otpStore.verify.mockResolvedValue(true);

    await expect(
      useCase.execute('user@example.com', '123456'),
    ).resolves.toEqual({ message: 'OTP verified successfully' });

    expect(otpStore.verify).toHaveBeenCalledWith(
      'password-reset:user@example.com',
      '123456',
    );
    expect(otpStore.delete).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired OTP', async () => {
    otpStore.verify.mockResolvedValue(false);

    await expect(
      useCase.execute('user@example.com', '000000'),
    ).rejects.toMatchObject({ message: 'Invalid or expired OTP' });
  });
});
