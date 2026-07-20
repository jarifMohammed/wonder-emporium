import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenAuthenticator } from '../../auth/application/services/access-token-authenticator.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authenticator: AccessTokenAuthenticator) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return true;

    const principal = await this.authenticator.authenticate(token);
    Object.assign(request, { user: principal });
    return true;
  }
}
