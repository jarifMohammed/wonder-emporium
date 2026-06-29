import { $Enums } from '@prisma/client';

export interface CreateOutboxEventData {
  aggregateId: string;
  type: string;
  payload: any;
}

export interface IOutboxRepository {
  createEvent(data: CreateOutboxEventData): Promise<any>;
  createEventWithTx(data: CreateOutboxEventData, tx: any): Promise<any>;
  getPendingEvents(): Promise<any[]>;
  getEventById(id: string): Promise<any | null>;
  markAsProcessed(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
  hasEventProcessed(aggregateId: string, type: string): Promise<boolean>;
}

export const OUTBOX_REPOSITORY_TOKEN = Symbol('IOutboxRepository');
