import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { PrismaKycRepository } from '../../infrastructure/persistence/prisma-kyc.repository';
import { EmailService } from '../../../common/services/email.service';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class ReviewKycUseCase {
  constructor(
    private readonly kycRepo: PrismaKycRepository,
    private readonly emailService: EmailService,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(
    targetAuthId: string,
    reviewerAdminId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminNote?: string,
  ) {
    const kyc = await this.kycRepo.findByAuthId(targetAuthId);
    if (!kyc) {
      throw AppError.notFound('KYC record not found for this author.');
    }
    if (kyc.kycStatus !== 'SUBMITTED') {
      throw AppError.badRequest(`Cannot review a KYC that is already ${kyc.kycStatus}.`);
    }

    const updated = await this.kycRepo.review(targetAuthId, {
      kycStatus: decision,
      adminNote,
      reviewedById: reviewerAdminId,
    });

    const author = await this.userRepository.findById(targetAuthId);
    if (author) {
      if (decision === 'APPROVED') {
        void this.emailService.sendKycApprovedEmail(author.email, author.username);
      } else {
        void this.emailService.sendKycRejectedEmail(author.email, author.username, adminNote);
      }
    }

    return {
      kycStatus: updated.kycStatus,
      reviewedAt: updated.reviewedAt,
      adminNote: updated.adminNote,
    };
  }

  async getKycStatus(authId: string) {
    const kyc = await this.kycRepo.findByAuthId(authId);
    return kyc ?? { kycStatus: 'NOT_SUBMITTED', submittedAt: null, reviewedAt: null, adminNote: null };
  }

  async listAll() {
    return this.kycRepo.findAllSubmitted();
  }
}
