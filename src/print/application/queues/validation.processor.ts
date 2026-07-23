import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LuluApiService } from '../../infrastructure/lulu/lulu-api.service';
import { PrismaPrintRepository } from '../../infrastructure/persistence/prisma-print.repository';
import { PricingService } from '../services/pricing.service';
import { PdfUtilsService } from '../services/pdf-utils.service';
import {
  LuluValidationResponse,
  LuluValidationStatus,
  PrintEditionData,
} from '../../domain/interfaces/lulu.types';

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
  interiorPpi?: number;
  coverFinish: string;
  bookType: string;
  printQuality: string;
  linenColor?: string;
  foilColor?: string;
  printInsideCover?: string;
  podPackageId?: string;
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
      trimSize,
      bindingType,
      interiorColor,
      paperType,
      interiorPpi,
      coverFinish,
      bookType,
      printQuality,
      linenColor,
      foilColor,
      printInsideCover,
      podPackageId,
    } = job.data;

    this.logger.log(`Starting validation for book ${bookId} (job ${job.id})`);

    try {
      await job.updateProgress(10);
      const pageCount = await this.pdfUtils.detectPageCount(interiorPdfUrl);

      await this.printRepo.updatePrintEdition(bookId, {
        pageCount,
        enabled: true,
        trimSize,
        bindingType,
        bookType,
        interiorColor,
        printQuality: printQuality || 'Standard',
        paperType,
        interiorPpi,
        coverFinish,
        linenColor: linenColor || 'X',
        foilColor: foilColor || 'X',
        printInsideCover: printInsideCover || 'No',
        podPackageId: podPackageId || '',
      } as Partial<PrintEditionData>);

      await job.updateProgress(30);
      const interiorStart =
        await this.luluApi.createInteriorValidation(interiorPdfUrl);
      await this.printRepo.updatePrintEdition(bookId, {
        validation: {
          interiorValidationId: String(interiorStart.id),
          coverValidationId: null,
          interiorStatus: interiorStart.status,
          coverStatus: null,
          validPodPackageIds: interiorStart.valid_pod_package_ids || [],
          coverDimensions: null,
          validated: false,
          validationErrors: this.toValidationErrors(interiorStart.errors),
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      const interiorResult = await this.pollValidation(
        () => this.luluApi.getInteriorValidation(interiorStart.id),
        ['VALIDATED'],
        ['ERROR'],
      );
      const detectedPageCount = Number(interiorResult.page_count) || pageCount;
      const matchedPricingRow = this.pricingService.findPricingRow({
        bookType,
        bind: bindingType,
        interiorColor,
        paperType,
        lamination: coverFinish,
        pageCount: detectedPageCount,
        printQuality: printQuality || 'Standard',
      });
      const selectedPodPackageId = podPackageId || matchedPricingRow?.newSku || '';
      if (!selectedPodPackageId) {
        throw new Error('No POD package ID could be resolved for print validation');
      }
      const validPodPackageIds = interiorResult.valid_pod_package_ids || [];
      const packageIsAllowed =
        !validPodPackageIds.length ||
        validPodPackageIds.includes(selectedPodPackageId);

      if (!packageIsAllowed) {
        throw new Error(
          `Selected POD package ${selectedPodPackageId} is not valid for interior PDF`,
        );
      }

      await this.printRepo.updatePrintEdition(bookId, {
        pageCount: detectedPageCount,
        validation: {
          interiorValidationId: String(interiorResult.id),
          coverValidationId: null,
          interiorStatus: interiorResult.status,
          coverStatus: null,
          validPodPackageIds,
          coverDimensions: null,
          validated: false,
          validationErrors: this.toValidationErrors(interiorResult.errors),
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      await job.updateProgress(55);
      const coverDimensions = await this.luluApi.calculateCoverDimensions({
        pod_package_id: selectedPodPackageId,
        interior_page_count: detectedPageCount,
      });

      const coverStart = await this.luluApi.createCoverValidation({
        source_url: coverPdfUrl,
        pod_package_id: selectedPodPackageId,
        interior_page_count: detectedPageCount,
      });

      await this.printRepo.updatePrintEdition(bookId, {
        validation: {
          interiorValidationId: String(interiorResult.id),
          coverValidationId: String(coverStart.id),
          interiorStatus: interiorResult.status,
          coverStatus: coverStart.status,
          validPodPackageIds,
          coverDimensions,
          validated: false,
          validationErrors: [
            ...this.toValidationErrors(interiorResult.errors),
            ...this.toValidationErrors(coverStart.errors),
          ],
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      await job.updateProgress(70);
      const coverResult = await this.pollValidation(
        () => this.luluApi.getCoverValidation(coverStart.id),
        ['NORMALIZED'],
        ['ERROR'],
      );

      const isValid =
        interiorResult.status === 'VALIDATED' &&
        coverResult.status === 'NORMALIZED';

      const errors = [
        ...this.toValidationErrors(interiorResult.errors),
        ...this.toValidationErrors(coverResult.errors),
      ];

      await this.printRepo.updatePrintEdition(bookId, {
        validation: {
          interiorValidationId: String(interiorResult.id),
          coverValidationId: String(coverResult.id),
          interiorStatus: interiorResult.status,
          coverStatus: coverResult.status,
          validPodPackageIds,
          coverDimensions,
          validated: isValid,
          validationErrors: errors,
          lastValidatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      if (isValid) {
        await job.updateProgress(80);
        const pricingRow = matchedPricingRow;

        if (pricingRow) {
          const manufacturingCost =
            this.pricingService.calculateManufacturingCost(
              pricingRow,
              detectedPageCount,
              'USD',
            );

          await this.printRepo.updatePrintEdition(bookId, {
            podPackageId: pricingRow.newSku,
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

  private async pollValidation(
    fetchStatus: () => Promise<LuluValidationResponse>,
    successStatuses: LuluValidationStatus[],
    failureStatuses: LuluValidationStatus[],
  ): Promise<LuluValidationResponse> {
    let latest = await fetchStatus();
    for (let attempt = 0; attempt < 20; attempt++) {
      if (successStatuses.includes(latest.status)) return latest;
      if (failureStatuses.includes(latest.status)) {
        throw new Error(
          `Lulu validation failed with status ${latest.status}: ${JSON.stringify(latest.errors || [])}`,
        );
      }
      await this.sleep(3000);
      latest = await fetchStatus();
    }
    throw new Error(`Lulu validation timed out with status ${latest.status}`);
  }

  private toValidationErrors(errors: unknown) {
    if (!errors) return [];
    if (!Array.isArray(errors)) {
      return [{ message: String(errors), code: 'LULU_VALIDATION_ERROR' }];
    }
    return errors.map((error) => {
      if (typeof error === 'string') {
        return { message: error, code: 'LULU_VALIDATION_ERROR' };
      }
      const item = error as { message?: string; code?: string; field?: string };
      return {
        message: item.message || JSON.stringify(error),
        code: item.code || 'LULU_VALIDATION_ERROR',
        field: item.field,
      };
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
