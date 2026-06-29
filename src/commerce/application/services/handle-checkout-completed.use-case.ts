import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORDER_REPOSITORY_TOKEN } from '../../domain/interfaces/order.repository.interface';
import type { IOrderRepository } from '../../domain/interfaces/order.repository.interface';
import { OUTBOX_REPOSITORY_TOKEN } from '../../domain/interfaces/outbox.repository.interface';
import type { IOutboxRepository } from '../../domain/interfaces/outbox.repository.interface';
import { PrismaService } from '../../../common/services/prisma.service';
import Stripe from 'stripe';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class HandleCheckoutCompletedUseCase {
  private readonly logger = new Logger(HandleCheckoutCompletedUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepository: IOrderRepository,
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
    private readonly prisma: PrismaService,
    @InjectQueue('commerce-outbox')
    private readonly outboxQueue: Queue,
  ) {}

  async execute(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.order_internal_id;
    if (!orderId) {
      this.logger.warn('Checkout session has no internal order ID in metadata');
      return;
    }

    // Check if event already processed (Idempotency)
    const isProcessed = await this.outboxRepository.hasEventProcessed(
      orderId,
      'ORDER_COMPLETED',
    );
    if (isProcessed) {
      this.logger.log(`Order ${orderId} already processed. Skipping.`);
      return;
    }

    const order = await this.orderRepository.getOrderBySessionId(session.id);
    if (!order) {
      this.logger.error(`Order with session ID ${session.id} not found.`);
      return;
    }

    if (order.status === 'COMPLETED') {
      return; // Already completed
    }

    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
    const subtotal = session.amount_subtotal
      ? session.amount_subtotal / 100
      : 0;
    const taxAmount = totalAmount - subtotal;

    // Use transaction for updating order and inserting outbox event
    const outboxEvent = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          totalAmount,
          subtotal,
          taxAmount,
          stripePaymentIntentId: (session.payment_intent as string) || null,
        },
      });

      // Insert outbox event for async processing (email and payouts)
      return await this.outboxRepository.createEventWithTx(
        {
          aggregateId: order.id,
          type: 'ORDER_COMPLETED',
          payload: {
            orderId: order.id,
            totalAmount,
            subtotal,
            taxAmount,
            currency: session.currency,
            customerEmail: session.customer_details?.email,
            items: order.items,
          },
        },
        tx,
      );
    });

    this.logger.log(
      `Order ${order.id} marked as COMPLETED and OutboxEvent created.`,
    );

    // Instantly trigger outbox processing via BullMQ
    await this.outboxQueue.add('process-event', { eventId: outboxEvent.id });
  }
}
