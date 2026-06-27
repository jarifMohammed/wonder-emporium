export enum userRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  SUPERADMIN = 'SUPERADMIN',
  READER = 'READER',
  AUTHOR = 'AUTHOR',
}

export interface AuthPrincipal {
  id: string;
  email: string;
  role: userRole;
  tokenVersion: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: userRole;
  tokenVersion: number;
  type: 'access' | 'refresh';
}
