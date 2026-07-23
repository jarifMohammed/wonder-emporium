import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LuluApiService } from '../../infrastructure/lulu/lulu-api.service';
import { PrismaPrintRepository } from '../../infrastructure/persistence/prisma-print.repository';
import {
  PrintJobData,
  LuluShippingAddress,
} from '../../domain/interfaces/lulu.types';

interface PrintJobRequestData {
  orderId: string;
  podPackageId: number;
  quantity: number;
  shippingLevel: string;
  shippingAddress: LuluShippingAddress;
  manufacturingCost: number;
}

@Processor('print-job-creation')
export class PrintJobProcessor extends WorkerHost {
  private readonly logger = new Logger(PrintJobProcessor.name);

  constructor(
    private readonly luluApi: LuluApiService,
    private readonly printRepo: PrismaPrintRepository,
  ) {
    super();
  }

  async process(job: Job<PrintJobRequestData>): Promise<void> {
    const {
      orderId,
      podPackageId,
      quantity,
      shippingLevel,
      shippingAddress,
      manufacturingCost,
    } = job.data;

    this.logger.log(`Creating print job for order ${orderId} (job ${job.id})`);

    try {
      await job.updateProgress(20);
      const printJob = await this.luluApi.createPrintJob({
        line_items: [
          {
            printable_id: podPackageId,
            quantity,
          },
        ],
        shipping_level: shippingLevel,
        shipping_address: shippingAddress,
      });

      await job.updateProgress(80);
      await this.printRepo.updatePrintJob(orderId, {
        luluJobId: printJob.id,
        quantity,
        manufacturingCostAtPurchase: manufacturingCost,
        shippingCost: 0,
        status: printJob.status,
        tracking: printJob.tracking || null,
        shippingLevel,
      } as Partial<PrintJobData>);

      await job.updateProgress(100);
      this.logger.log(
        `Print job created for order ${orderId}: Lulu job #${printJob.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create print job for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Print job creation job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Print job creation job ${job.id} failed: ${error.message}`,
    );
    if (job.attemptsMade >= job.opts.attempts!) {
      this.logger.error(
        `Print job ${job.id} for order ${job.data.orderId} permanently failed.`,
      );
      try {
        await this.printRepo.updatePrintJob(job.data.orderId, {
          status: 'FAILED',
        } as Partial<PrintJobData>);
      } catch (e: any) {
        this.logger.error(
          `Could not mark order ${job.data.orderId} print job as failed in DB: ${e.message}`,
        );
      }
    }
  }
}
