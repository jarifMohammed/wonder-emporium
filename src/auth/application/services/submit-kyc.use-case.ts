import { Injectable, Inject } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { PrismaKycRepository, SubmitKycInput } from '../../infrastructure/persistence/prisma-kyc.repository';
import { S3FileStorageService } from '../../../books/infrastructure/storage/s3-file-storage.service';
import { EMAIL_SENDER_TOKEN } from '../../../common/domain/interfaces/email-sender.interface';
import type { IEmailSender } from '../../../common/domain/interfaces/email-sender.interface';

@Injectable()
export class SubmitKycUseCase {
  constructor(
    private readonly kycRepo: PrismaKycRepository,
    private readonly s3: S3FileStorageService,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailService: IEmailSender,
  ) {}

  async execute(
    authId: string,
    authorEmail: string,
    authorUsername: string,
    files: {
      idFront: Express.Multer.File;
      idBack: Express.Multer.File;
      taxFormFile?: Express.Multer.File;
    },
    body: {
      taxFormType: string;
      taxpayerName: string;
      taxId: string;
      taxCountry: string;
    },
  ) {
    const existing = await this.kycRepo.findByAuthId(authId);
    if (existing?.kycStatus === 'APPROVED') {
      throw AppError.badRequest('Your KYC has already been approved.');
    }

    const folder = `kyc/${authId}`;
    const [idFrontUpload, idBackUpload] = await Promise.all([
      this.s3.uploadFile(files.idFront, `${folder}/id-front`),
      this.s3.uploadFile(files.idBack, `${folder}/id-back`),
    ]);

    let taxFormFileUrl: string | undefined;
    let taxFormFileKey: string | undefined;
    if (files.taxFormFile) {
      const taxUpload = await this.s3.uploadFile(files.taxFormFile, `${folder}/tax-form`);
      taxFormFileUrl = taxUpload.url;
      taxFormFileKey = taxUpload.fileKey;
    }

    const input: SubmitKycInput = {
      authId,
      idFrontUrl: idFrontUpload.url,
      idFrontKey: idFrontUpload.fileKey,
      idBackUrl: idBackUpload.url,
      idBackKey: idBackUpload.fileKey,
      taxFormType: body.taxFormType,
      taxpayerName: body.taxpayerName,
      taxId: body.taxId,
      taxCountry: body.taxCountry,
      taxFormFileUrl,
      taxFormFileKey,
    };

    const kyc = await this.kycRepo.upsert(input);

    // Notify admin
    void this.emailService.sendTaxFormSubmittedAdminNotificationEmail({
      authorId: authId,
      authorEmail,
      authorUsername,
    });

    return { kycStatus: kyc.kycStatus, submittedAt: kyc.submittedAt };
  }
}
