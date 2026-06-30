import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { OutboxProcessorService } from '../services/outbox-processor.service';
import { OUTBOX_REPOSITORY_TOKEN } from '../../domain/interfaces/outbox.repository.interface';
import type { IOutboxRepository } from '../../domain/interfaces/outbox.repository.interface';

@Processor('commerce-outbox')
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly outboxProcessorService: OutboxProcessorService,
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
  ) {
    super();
  }

  async process(job: Job<{ eventId: string }>): Promise<void> {
    this.logger.log(
      `Processing outbox event job ${job.id} for event ${job.data.eventId}`,
    );

    // Retrieve the full event from the database
    const event = await this.outboxRepository.getEventById(job.data.eventId);

    if (!event) {
      this.logger.error(
        `OutboxEvent ${job.data.eventId} not found in database`,
      );
      return;
    }

    if (event.status !== 'PENDING') {
      this.logger.log(
        `OutboxEvent ${job.data.eventId} is already processed or failed. Status: ${event.status}`,
      );
      return;
    }

    await this.outboxProcessorService.processEvent(event);
  }
}
