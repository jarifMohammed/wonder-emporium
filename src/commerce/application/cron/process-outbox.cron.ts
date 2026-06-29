import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OUTBOX_REPOSITORY_TOKEN } from '../../domain/interfaces/outbox.repository.interface';
import type { IOutboxRepository } from '../../domain/interfaces/outbox.repository.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ProcessOutboxEventsCron {
  private readonly logger = new Logger(ProcessOutboxEventsCron.name);

  constructor(
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
    @InjectQueue('commerce-outbox')
    private readonly outboxQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Scanning for pending outbox events...');
    const events = await this.outboxRepository.getPendingEvents();

    if (events.length === 0) return;

    for (const event of events) {
      this.logger.log(`Pushing pending event ${event.id} to BullMQ queue...`);
      await this.outboxQueue.add('process-event', { eventId: event.id });
    }
  }
}
