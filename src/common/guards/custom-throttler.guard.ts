import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * Custom Throttler Guard — Rate limiting is currently DISABLED globally.
 * All requests are allowed through without throttle checks.
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

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    // Rate limiting disabled — skip throttle checks for all routes
    return true;
  }
}
