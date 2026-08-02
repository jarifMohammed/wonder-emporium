import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { $Enums } from '@prisma/client';

export interface AuthorKycData {
  id: string;
  authId: string;
  idFrontUrl: string | null;
  idFrontKey: string | null;
  idBackUrl: string | null;
  idBackKey: string | null;
  taxFormType: string | null;
  taxpayerName: string | null;
  taxId: string | null;
  taxCountry: string | null;
  taxFormFileUrl: string | null;
  taxFormFileKey: string | null;
  kycStatus: string;
  adminNote: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitKycInput {
  authId: string;
  idFrontUrl: string;
  idFrontKey: string;
  idBackUrl: string;
  idBackKey: string;
  taxFormType: string;
  taxpayerName: string;
  taxId: string;
  taxCountry: string;
  taxFormFileUrl?: string;
  taxFormFileKey?: string;
}

export interface ReviewKycInput {
  kycStatus: 'APPROVED' | 'REJECTED';
  adminNote?: string;
  reviewedById: string;
}

@Injectable()
export class PrismaKycRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthId(authId: string): Promise<AuthorKycData | null> {
    const kyc = await this.prisma.authorKyc.findUnique({ where: { authId } });
    return kyc as AuthorKycData | null;
  }

  async upsert(input: SubmitKycInput): Promise<AuthorKycData> {
    const data = {
      idFrontUrl: input.idFrontUrl,
      idFrontKey: input.idFrontKey,
      idBackUrl: input.idBackUrl,
      idBackKey: input.idBackKey,
      taxFormType: input.taxFormType,
      taxpayerName: input.taxpayerName,
      taxId: input.taxId,
      taxCountry: input.taxCountry,
      taxFormFileUrl: input.taxFormFileUrl ?? null,
      taxFormFileKey: input.taxFormFileKey ?? null,
      kycStatus: $Enums.KycStatus.SUBMITTED,
      adminNote: null,
      submittedAt: new Date(),
    };

    const kyc = await this.prisma.authorKyc.upsert({
      where: { authId: input.authId },
      create: { authId: input.authId, ...data },
      update: data,
    });
    return kyc as AuthorKycData;
  }

  async review(authId: string, input: ReviewKycInput): Promise<AuthorKycData> {
    const kyc = await this.prisma.authorKyc.update({
      where: { authId },
      data: {
        kycStatus: input.kycStatus as $Enums.KycStatus,
        adminNote: input.adminNote ?? null,
        reviewedAt: new Date(),
        reviewedById: input.reviewedById,
      },
    });
    return kyc as AuthorKycData;
  }

  async findAllSubmitted(): Promise<(AuthorKycData & { author: { email: string; username: string; userProfile: any } })[]> {
    const list = await this.prisma.authorKyc.findMany({
      where: { kycStatus: { in: [$Enums.KycStatus.SUBMITTED, $Enums.KycStatus.APPROVED, $Enums.KycStatus.REJECTED] } },
      include: {
        authUser: {
          select: {
            id: true,
            email: true,
            username: true,
            userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return list.map((k: any) => ({
      ...(k as AuthorKycData),
      author: k.authUser,
    }));
  }
}
