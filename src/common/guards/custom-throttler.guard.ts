import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';

/**
 * Custom Throttler Guard that skips rate limiting for:
 * - Swagger/OpenAPI endpoints (/docs, /docs-json, etc.)
 * - Metrics endpoints (/metrics)
 * - Health check endpoints
 * - Local loopback IP requests (development / internal server requests)
 * - Requests with valid internal secret header (trusted backend/frontend servers)
 * - Authenticated requests with a valid JWT access token
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: any,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.url as string;
    const ip = request.ip as string;

    // 1. Skip throttling for local loopback IPs (development / internal requests on the same server)
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      (ip && ip.startsWith('::ffff:127.0.0.'))
    ) {
      return true;
    }

    // 2. Skip throttling if the request has a valid internal secret header from a trusted frontend server
    const internalSecret = request.headers['x-internal-secret'];
    const configuredSecret =
      process.env.INTERNAL_API_SECRET || 'dev-internal-secret-key-12345';
    if (internalSecret === configuredSecret) {
      return true;
    }

    // 3. Skip throttling if request has a valid authorization JWT access token
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const secret =
            process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';
          const decoded = jwt.verify(token, secret) as any;
          if (decoded && decoded.type === 'access') {
            return true;
          }
        } catch {
          // Invalid or expired token — proceed to regular rate limiting
        }
      }
    }

    // Skip throttling for Swagger/OpenAPI documentation
    if (
      path.startsWith('/docs') ||
      path.startsWith('/api-json') ||
      path.startsWith('/swagger') ||
      path.includes('swagger') ||
      path.includes('-json')
    ) {
      return true;
    }

    // Skip throttling for metrics endpoints (Prometheus)
    if (path.startsWith('/metrics')) {
      return true;
    }

    // Skip throttling for favicon
    if (path === '/favicon.ico') {
      return true;
    }

    // Skip throttling for admin routes — already gated by AuthGuard + RolesGuard
    // (ADMIN / SUPERADMIN only), so rate-limiting adds no security benefit and
    // actively breaks dashboard server-component fetches.
    if (path.includes('/admin/')) {
      return true;
    }

    // Check if route has @SkipThrottle decorator
    return super.shouldSkip(context);
  }
}
