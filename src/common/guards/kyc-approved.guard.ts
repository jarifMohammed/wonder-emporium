import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaKycRepository } from '../../auth/infrastructure/persistence/prisma-kyc.repository';

/**
 * KycApprovedGuard
 *
 * Blocks access if the requesting AUTHOR's KYC status is not APPROVED.
 * Apply this guard on book creation/submission endpoints.
 */
@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(private readonly kycRepo: PrismaKycRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string; role: string } | undefined;

    // Only enforce for AUTHORS — admins bypass
    if (!user || user.role !== 'AUTHOR') {
      return true;
    }

    const kyc = await this.kycRepo.findByAuthId(user.id);
    if (!kyc || kyc.kycStatus !== 'APPROVED') {
      throw new ForbiddenException(
        'Your identity and tax forms must be verified by an administrator before you can publish books. ' +
          `Current KYC status: ${kyc?.kycStatus ?? 'NOT_SUBMITTED'}.`,
      );
    }

    return true;
  }
}
