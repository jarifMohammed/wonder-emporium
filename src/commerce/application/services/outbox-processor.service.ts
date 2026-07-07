import { Injectable, Logger, Inject } from '@nestjs/common';
import { OUTBOX_REPOSITORY_TOKEN } from '../../domain/interfaces/outbox.repository.interface';
import type { IOutboxRepository } from '../../domain/interfaces/outbox.repository.interface';
import { COMMERCE_REPOSITORY_TOKEN } from '../../domain/interfaces/commerce.repository.interface';
import type { ICommerceRepository } from '../../domain/interfaces/commerce.repository.interface';
import {
  EMAIL_SENDER_TOKEN,
  type IEmailSender,
} from '../../../common/domain/interfaces/email-sender.interface';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(COMMERCE_REPOSITORY_TOKEN)
    private readonly commerceRepository: ICommerceRepository,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
    private readonly prisma: PrismaService,
  ) {}

  async processEvent(event: any) {
    this.logger.log(
      `Processing outbox event ${event.id} of type ${event.type}`,
    );

    try {
      if (event.type === 'ORDER_COMPLETED') {
        await this.processOrderCompleted(event.payload);
      } else {
        this.logger.warn(`Unknown outbox event type: ${event.type}`);
      }

      await this.outboxRepository.markAsProcessed(event.id);
      this.logger.log(`Outbox event ${event.id} processed successfully.`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to process outbox event ${event.id}: ${err.message}`,
      );
      await this.outboxRepository.markAsFailed(event.id, err.message);
    }
  }

  private async processOrderCompleted(payload: any) {
    const {
      orderId,
      totalAmount,
      subtotal,
      taxAmount,
      currency,
      customerEmail,
      items,
    } = payload;

    // 1. Send receipt email to buyer via BullMQ
    if (customerEmail) {
      const itemsForEmail = items.map((item: any) => ({
        name: `Book ${item.bookId} (${item.formatId})`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      await this.emailSender.sendOrderReceiptEmail(customerEmail, {
        orderId,
        totalAmount,
        taxAmount,
        currency: currency || 'usd',
        items: itemsForEmail,
      });
      this.logger.log(`Order receipt email queued for ${customerEmail}`);
    } else {
      this.logger.warn(
        `No customer email for order ${orderId} — skipping receipt email`,
      );
    }

    // 2. Accumulate pending balances for Authors + send sale notification emails
    const authorTotals: Record<string, number> = {};
    for (const item of items) {
      if (!authorTotals[item.authorId]) {
        authorTotals[item.authorId] = 0;
      }
      authorTotals[item.authorId] += item.totalPrice * 100; // converting to cents
    }

    for (const [authorId, amountInCents] of Object.entries(authorTotals)) {
      const connectedAccount =
        await this.commerceRepository.getConnectedAccountByAuthId(authorId);

      if (!connectedAccount) {
        this.logger.error(
          `Author ${authorId} does not have a connected Stripe account. Balance cannot be recorded.`,
        );
        continue;
      }

      // Fetch author details to determine fee split and get email
      const authorUser = await this.prisma.authUser.findUnique({
        where: { id: authorId },
        select: { email: true, isFoundingAuthor: true },
      });

      if (!authorUser) {
        this.logger.error(`Author ${authorId} not found in database.`);
        continue;
      }

      const platformFeePercentage = authorUser.isFoundingAuthor ? 0.15 : 0.35;
      const platformFee = Math.round(amountInCents * platformFeePercentage);
      const authorPayout = amountInCents - platformFee;

      this.logger.log(
        `Adding ${authorPayout} cents to author ${authorId}'s pending balance (Platform Fee kept: ${platformFee} cents, isFoundingAuthor: ${authorUser.isFoundingAuthor}) for order ${orderId}`,
      );

      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.stripeConnectedAccount.update({
            where: { authId: authorId },
            data: {
              pendingBalance: {
                increment: authorPayout / 100,
              },
            },
          });

          await tx.authorOrderPayout.create({
            data: {
              orderId,
              authorId,
              amount: authorPayout / 100,
              platformFee: platformFee / 100,
              status: 'PENDING_REQUEST',
            },
          });
        });
      } catch (txError: any) {
        if (txError.code === 'P2002') {
          this.logger.warn(`Payout for order ${orderId} and author ${authorId} already exists. Skipping duplicate.`);
        } else {
          throw txError;
        }
      }

      // Send sale notification email to author
      try {
        if (authorUser.email) {
          await this.emailSender.sendAuthorSaleNotificationEmail(
            authorUser.email,
            {
              orderId,
              earningsAmount: authorPayout / 100,
              platformFee: platformFee / 100,
              currency: currency || 'usd',
            },
          );
          this.logger.log(
            `Author sale notification email queued for ${authorUser.email}`,
          );
        }
      } catch (emailError) {
        // Non-critical — balance is already recorded, just log
        this.logger.warn(
          `Failed to queue author sale email for author ${authorId}: ${(emailError as Error).message}`,
        );
      }
    }
  }
}
