import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LuluApiService } from '../../infrastructure/lulu/lulu-api.service';
import { PrismaPrintRepository } from '../../infrastructure/persistence/prisma-print.repository';
import { PrintJobData } from '../../domain/interfaces/lulu.types';

interface StatusSyncJobData {
  orderId: string;
  luluJobId: number;
}

@Processor('print-status-sync')
export class StatusSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(StatusSyncProcessor.name);

  constructor(
    private readonly luluApi: LuluApiService,
    private readonly printRepo: PrismaPrintRepository,
  ) {
    super();
  }

  async process(job: Job<StatusSyncJobData>): Promise<void> {
    const { orderId, luluJobId } = job.data;

    this.logger.log(
      `Syncing print job status for order ${orderId}, Lulu job #${luluJobId} (job ${job.id})`,
    );

    try {
      const printJob = await this.luluApi.getPrintJob(luluJobId);

      await this.printRepo.updatePrintJob(orderId, {
        status: printJob.status,
        tracking: printJob.tracking || null,
      } as Partial<PrintJobData>);

      this.logger.log(
        `Print job ${luluJobId} status synced: ${printJob.status}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Status sync failed for Lulu job #${luluJobId}: ${error.message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Status sync job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Status sync job ${job.id} failed: ${error.message}`);
  }
}
