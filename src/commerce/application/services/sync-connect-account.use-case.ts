import { Inject, Injectable, Logger } from '@nestjs/common';
import { COMMERCE_REPOSITORY_TOKEN } from '../../domain/interfaces/commerce.repository.interface';
import type { ICommerceRepository } from '../../domain/interfaces/commerce.repository.interface';
import {
  EMAIL_SENDER_TOKEN,
  type IEmailSender,
} from '../../../common/domain/interfaces/email-sender.interface';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class SyncConnectAccountUseCase {
  private readonly logger = new Logger(SyncConnectAccountUseCase.name);

  constructor(
    @Inject(COMMERCE_REPOSITORY_TOKEN)
    private readonly commerceRepository: ICommerceRepository,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    stripeAccountId: string,
    chargesEnabled: boolean,
    payoutsEnabled: boolean,
  ): Promise<void> {
    this.logger.log(`Syncing capabilities for account ${stripeAccountId} (Charges: ${chargesEnabled}, Payouts: ${payoutsEnabled})`);

    // Fetch current state to detect first-time activation
    const before = await this.commerceRepository.getConnectedAccountByStripeId(stripeAccountId);

    await this.commerceRepository.updateConnectedAccountStatus(
      stripeAccountId,
      chargesEnabled,
      payoutsEnabled,
    );

    // Send "account approved" email only on first-time activation
    if (before && !before.chargesEnabled && chargesEnabled && payoutsEnabled) {
      try {
        const author = await this.prisma.authUser.findUnique({
          where: { id: before.authId },
          select: { email: true, username: true },
        });

        if (author?.email) {
          await this.emailSender.sendAuthorOnboardingApprovedEmail(
            author.email,
            author.username,
          );
          this.logger.log(`Author onboarding-approved email queued for ${author.email}`);
        }
      } catch (emailError) {
        // Non-critical — the account is already approved
        this.logger.warn(`Failed to queue onboarding-approved email for account ${stripeAccountId}: ${(emailError as Error).message}`);
      }
    }
  }
}
