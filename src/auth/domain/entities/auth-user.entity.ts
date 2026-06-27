import type { userRole } from '../../interfaces/auth.interface';

export class AuthUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly username: string,
    public readonly role: userRole,
    public readonly verified: boolean,
    public readonly status: string,
    public readonly tokenVersion: number,
    public readonly provider: string,
    public readonly providerId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  isActive(): boolean {
    return this.status === 'ACTIVE' && this.deletedAt === null;
  }

  isVerified(): boolean {
    return this.verified;
  }
}
