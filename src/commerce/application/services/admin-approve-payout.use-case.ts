import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class AdminApprovePayoutUseCase {
  private readonly logger = new Logger(AdminApprovePayoutUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async execute(payoutId: string) {
    const payout = await this.prisma.authorOrderPayout.findUnique({
      where: { id: payoutId },
      include: {
        author: {
          include: { stripeAccount: true },
        },
      },
    });

    if (!payout) {
      throw AppError.notFound('Payout not found');
    }

    if (payout.status !== 'REQUESTED') {
      throw AppError.badRequest(
        `Cannot approve payout in status: ${payout.status}`,
      );
    }

    if (
      !payout.author.stripeAccount ||
      !payout.author.stripeAccount.stripeAccountId
    ) {
      throw AppError.badRequest(
        'Author does not have a connected Stripe account',
      );
    }

    if (!payout.author.stripeAccount.payoutsEnabled) {
      throw AppError.badRequest(
        'Author Stripe account is not fully verified/enabled for payouts',
      );
    }

    try {
      // 1. Initiate Stripe Transfer
      // Stripe amount must be in integer cents. payout.amount is in dollars.
      const amountInCents = Math.round(payout.amount * 100);

      const transfer = await this.stripeService.createTransfer(
        amountInCents,
        'usd',
        payout.author.stripeAccount.stripeAccountId,
        `Payout for Order ${payout.orderId}`,
      );

      // 2. Update payout status in DB
      const updatedPayout = await this.prisma.$transaction(async (tx) => {
        // Mark payout as PAID
        const updated = await tx.authorOrderPayout.update({
          where: { id: payoutId },
          data: {
            status: 'PAID',
            stripeTransferId: transfer.id,
          },
        });

        // Deduct from pending balance
        await tx.stripeConnectedAccount.update({
          where: { authId: payout.authorId },
          data: {
            pendingBalance: { decrement: payout.amount },
          },
        });

        return updated;
      });

      this.logger.log(
        `Payout ${payoutId} approved and transfer ${transfer.id} executed`,
      );
      return updatedPayout;
    } catch (error: any) {
      this.logger.error(
        `Failed to execute Stripe transfer for payout ${payoutId}: ${error.message}`,
      );
      throw AppError.internalServerError(`Transfer failed: ${error.message}`);
    }
  }
}
