import type { userRole } from '../../interfaces/auth.interface';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserOutput {
  id: string;
  email: string;
  username: string;
  role: userRole;
  verified: boolean;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}
