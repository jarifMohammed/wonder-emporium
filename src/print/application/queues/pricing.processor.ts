import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaPrintRepository } from '../../infrastructure/persistence/prisma-print.repository';
import { PricingService } from '../services/pricing.service';
import { PrintEditionData } from '../../domain/interfaces/lulu.types';

interface PricingJobData {
  bookId: string;
  bookType: string;
  bind: string;
  interiorColor: string;
  paperType: string;
  lamination: string;
  pageCount: number;
  printQuality?: string;
  authorProfit?: number;
  sellingPrice?: number;
  currency: string;
}

@Processor('print-pricing')
export class PricingProcessor extends WorkerHost {
  private readonly logger = new Logger(PricingProcessor.name);

  constructor(
    private readonly printRepo: PrismaPrintRepository,
    private readonly pricingService: PricingService,
  ) {
    super();
  }

  async process(job: Job<PricingJobData>): Promise<void> {
    const {
      bookId,
      bookType,
      bind,
      interiorColor,
      paperType,
      lamination,
      pageCount,
      printQuality,
      authorProfit,
      sellingPrice,
      currency,
    } = job.data;

    this.logger.log(`Calculating pricing for book ${bookId} (job ${job.id})`);

    try {
      const pricingRow = this.pricingService.findPricingRow({
        bookType,
        bind,
        interiorColor,
        paperType,
        lamination,
        pageCount,
        printQuality: printQuality || 'Standard',
      });

      if (!pricingRow) {
        this.logger.warn(`No pricing row found for book ${bookId}`);
        return;
      }

      const manufacturingCost = this.pricingService.calculateManufacturingCost(
        pricingRow,
        pageCount,
        (currency as any) || 'USD',
      );

      const existing = await this.printRepo.getPrintEdition(bookId);
      const currentProfit =
        authorProfit ?? existing?.pricing?.authorProfit ?? 0;
      const currentSellingPrice =
        sellingPrice ?? existing?.pricing?.sellingPrice ?? 0;

      let newAuthorProfit = currentProfit;
      let newSellingPrice = currentSellingPrice;

      if (authorProfit !== undefined && sellingPrice === undefined) {
        newSellingPrice =
          Math.round((manufacturingCost + authorProfit) * 100) / 100;
      } else if (sellingPrice !== undefined && authorProfit === undefined) {
        newAuthorProfit =
          Math.round((sellingPrice - manufacturingCost) * 100) / 100;
      }

      await this.printRepo.updatePrintEdition(bookId, {
        pricing: {
          manufacturingCost,
          currency,
          authorProfit: newAuthorProfit,
          sellingPrice: newSellingPrice,
          lastCalculatedAt: new Date().toISOString(),
        },
      } as Partial<PrintEditionData>);

      this.logger.log(
        `Pricing updated for book ${bookId}: cost=$${manufacturingCost}, profit=$${newAuthorProfit}, price=$${newSellingPrice}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Pricing calculation failed for book ${bookId}: ${error.message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Pricing job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Pricing job ${job.id} failed: ${error.message}`);
  }
}
