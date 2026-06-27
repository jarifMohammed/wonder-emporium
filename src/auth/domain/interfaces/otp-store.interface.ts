export interface IOtpStore {
  save(email: string, otp: string, ttlSeconds: number): Promise<void>;
  verify(email: string, otp: string): Promise<boolean>;
  delete(email: string): Promise<void>;
}

export const OTP_STORE_TOKEN = Symbol('IOtpStore');
