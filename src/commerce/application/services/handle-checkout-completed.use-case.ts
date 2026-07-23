import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ORDER_REPOSITORY_TOKEN } from '../../domain/interfaces/order.repository.interface';
import type { IOrderRepository } from '../../domain/interfaces/order.repository.interface';
import { OUTBOX_REPOSITORY_TOKEN } from '../../domain/interfaces/outbox.repository.interface';
import type { IOutboxRepository } from '../../domain/interfaces/outbox.repository.interface';
import { PrismaService } from '../../../common/services/prisma.service';
import Stripe from 'stripe';
import { PrintEditionData } from '../../../print/domain/interfaces/lulu.types';

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
    @InjectQueue('print-job-creation')
    private readonly printJobQueue: Queue,
  ) {}

  async execute(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.order_internal_id;
    if (!orderId) {
      this.logger.warn('Checkout session has no internal order ID in metadata');
      return;
    }

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
      return;
    }

    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
    const subtotal = session.amount_subtotal
      ? session.amount_subtotal / 100
      : 0;
    const taxAmount = totalAmount - subtotal;

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

      if (
        order.items &&
        order.items.length > 0 &&
        subtotal > 0 &&
        taxAmount > 0
      ) {
        for (const item of order.items) {
          const itemProportion = item.totalPrice / subtotal;
          const itemTax = itemProportion * taxAmount;
          await tx.orderItem.update({
            where: { id: item.id },
            data: { taxAmount: itemTax },
          });
        }
      }

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

    await this.outboxQueue.add('process-event', { eventId: outboxEvent.id });

    await this.createPrintJobsIfNeeded(order, session);
  }

  private async createPrintJobsIfNeeded(
    order: any,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    for (const item of order.items || []) {
      try {
        const format = await this.prisma.bookFormatPricing.findUnique({
          where: { id: item.formatId },
        });

        if (
          !format ||
          !['PAPERBACK', 'HARDCOVER'].includes(format.formatType.toUpperCase())
        ) {
          continue;
        }

        const book = await this.prisma.book.findUnique({
          where: { id: item.bookId },
        });

        if (!book) continue;

        const printEdition = (book as any)
          .printEdition as PrintEditionData | null;
        if (!printEdition?.enabled) continue;

        const podPackageId = parseInt(printEdition.podPackageId, 10);
        if (isNaN(podPackageId) || podPackageId <= 0) {
          this.logger.warn(
            `Invalid POD package ID for book ${item.bookId}: ${printEdition.podPackageId}`,
          );
          continue;
        }

        const sess = session as any;
        const shipDetail = sess.shipping_details;
        const shipAddr = shipDetail?.address || {};

        const shippingAddress = {
          name: shipDetail?.name || 'Customer',
          street1: shipAddr?.line1 || '',
          street2: shipAddr?.line2,
          city: shipAddr?.city || '',
          state_code: shipAddr?.state || '',
          country_code: shipAddr?.country || 'US',
          postcode: shipAddr?.postal_code || '',
          phone: shipDetail?.phone,
        };

        await this.printJobQueue.add(
          'create-print-job',
          {
            orderId: order.id,
            podPackageId,
            quantity: item.quantity,
            shippingLevel: 'MAIL',
            shippingAddress,
            manufacturingCost: printEdition.pricing?.manufacturingCost || 0,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );

        this.logger.log(
          `Print job enqueued for order ${order.id}, book ${item.bookId}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to enqueue print job for order ${order.id}, item ${item.bookId}: ${error.message}`,
        );
      }
    }
  }
}
