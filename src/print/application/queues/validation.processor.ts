import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LuluApiService } from '../../infrastructure/lulu/lulu-api.service';
import { PrismaPrintRepository } from '../../infrastructure/persistence/prisma-print.repository';
import { PricingService } from '../services/pricing.service';
import { PdfUtilsService } from '../services/pdf-utils.service';
import { PrintEditionData } from '../../domain/interfaces/lulu.types';

interface ValidationJobData {
  bookId: string;
  interiorPdfUrl: string;
  coverPdfUrl: string;
  interiorFileName: string;
  coverFileName: string;
  trimSize: string;
  bindingType: string;
  interiorColor: string;
  paperType: string;
  coverFinish: string;
  bookType: string;
  printQuality: string;
}

@Processor('print-validation')
export class ValidationProcessor extends WorkerHost {
  private readonly logger = new Logger(ValidationProcessor.name);

  constructor(
    private readonly luluApi: LuluApiService,
    private readonly printRepo: PrismaPrintRepository,
    private readonly pricingService: PricingService,
    private readonly pdfUtils: PdfUtilsService,
  ) {
    super();
  }

  async process(job: Job<ValidationJobData>): Promise<void> {
    const {
      bookId,
      interiorPdfUrl,
      coverPdfUrl,
      interiorFileName,
      coverFileName,
      trimSize,
      bindingType,
      interiorColor,
      paperType,
      coverFinish,
      bookType,
      printQuality,
    } = job.data;

    this.logger.log(`Starting validation for book ${bookId} (job ${job.id})`);

    try {
      await job.updateProgress(10);
      const pageCount = await this.pdfUtils.detectPageCount(interiorPdfUrl);

      await this.printRepo.updatePrintEdition(bookId, {
        pageCount,
      } as Partial<PrintEditionData>);

      await job.updateProgress(30);
      const interiorResult = await this.luluApi.validateInteriorPdf(
        interiorPdfUrl,
        interiorFileName,
      );

      const coverResult = await this.luluApi.validateCoverPdf(
        coverPdfUrl,
        coverFileName,
      );

      await job.updateProgress(70);
      const isValid =
        interiorResult.status === 'VALID' && coverResult.status === 'VALID';

      const errors = [
        ...(interiorResult.errors || []),
        ...(coverResult.errors || []),
      ];

      await this.printRepo.updatePrintEdition(bookId, {
        validation: {
          interiorValidationId: interiorResult.id,
          coverValidationId: coverResult.id,
          interiorStatus: interiorResult.status,
          coverStatus: coverResult.status,
          validated: isValid,
          validationErrors: errors,
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      if (isValid) {
        await job.updateProgress(80);
        const pricingRow = this.pricingService.findPricingRow({
          bookType,
          bind: bindingType,
          interiorColor,
          paperType,
          lamination: coverFinish,
          pageCount,
          printQuality: printQuality || 'Standard',
        });

        if (pricingRow) {
          const manufacturingCost =
            this.pricingService.calculateManufacturingCost(
              pricingRow,
              pageCount,
              'USD',
            );

          await this.printRepo.updatePrintEdition(bookId, {
            pricing: {
              manufacturingCost,
              currency: 'USD',
              authorProfit: 0,
              sellingPrice: 0,
              lastCalculatedAt: new Date().toISOString(),
            },
          } as Partial<PrintEditionData>);

          this.logger.log(
            `Manufacturing cost calculated for book ${bookId}: $${manufacturingCost}`,
          );
        }
      }

      await job.updateProgress(100);
      this.logger.log(
        `Validation complete for book ${bookId}: interior=${interiorResult.status}, cover=${coverResult.status}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Validation failed for book ${bookId}: ${error.message}`,
      );

      await this.printRepo.updatePrintEdition(bookId, {
        validation: {
          interiorStatus: 'FAILED',
          coverStatus: 'FAILED',
          validated: false,
          validationErrors: [
            { message: error.message, code: 'VALIDATION_FAILED' },
          ],
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Validation job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Validation job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
