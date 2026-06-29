import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IOutboxRepository,
  CreateOutboxEventData,
} from '../../domain/interfaces/outbox.repository.interface';
import { $Enums } from '@prisma/client';

@Injectable()
export class PrismaOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(data: CreateOutboxEventData): Promise<any> {
    return this.prisma.outboxEvent.create({
      data: {
        aggregateId: data.aggregateId,
        type: data.type,
        payload: data.payload,
        status: $Enums.OutboxStatus.PENDING,
      },
    });
  }

  async createEventWithTx(data: CreateOutboxEventData, tx: any): Promise<any> {
    return tx.outboxEvent.create({
      data: {
        aggregateId: data.aggregateId,
        type: data.type,
        payload: data.payload,
        status: $Enums.OutboxStatus.PENDING,
      },
    });
  }

  async getPendingEvents(): Promise<any[]> {
    return this.prisma.outboxEvent.findMany({
      where: { status: $Enums.OutboxStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEventById(id: string): Promise<any | null> {
    return this.prisma.outboxEvent.findUnique({
      where: { id },
    });
  }

  async markAsProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: $Enums.OutboxStatus.PROCESSED, processedAt: new Date() },
    });
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: $Enums.OutboxStatus.FAILED,
        error,
        processedAt: new Date(),
      },
    });
  }

  async hasEventProcessed(aggregateId: string, type: string): Promise<boolean> {
    const event = await this.prisma.outboxEvent.findFirst({
      where: { aggregateId, type, status: { not: $Enums.OutboxStatus.FAILED } },
    });
    return !!event;
  }
}
