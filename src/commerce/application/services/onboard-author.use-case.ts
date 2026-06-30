import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { COMMERCE_REPOSITORY_TOKEN } from '../../domain/interfaces/commerce.repository.interface';
import type { ICommerceRepository } from '../../domain/interfaces/commerce.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class OnboardAuthorUseCase {
  constructor(
    @Inject(COMMERCE_REPOSITORY_TOKEN)
    private readonly commerceRepository: ICommerceRepository,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    authId: string,
    email: string,
    country: string = 'US',
  ): Promise<{ onboardingUrl: string }> {
    let connectedAccount =
      await this.commerceRepository.getConnectedAccountByAuthId(authId);

    if (!connectedAccount) {
      // Create new Connect account
      const account = await this.stripeService.createConnectAccount(
        email,
        country,
      );
      connectedAccount = await this.commerceRepository.createConnectedAccount(
        authId,
        account.id,
      );
    }

    // Build redirect URLs from environment configuration
    const frontendUrl = this.configService.get<string>(
      'APP_FRONTEND_URL',
      'http://localhost:3000',
    );
    const refreshPath = this.configService.get<string>(
      'STRIPE_CONNECT_REFRESH_PATH',
      '/onboarding/refresh',
    );
    const returnPath = this.configService.get<string>(
      'STRIPE_CONNECT_RETURN_PATH',
      '/onboarding/complete',
    );
    const refreshUrl = `${frontendUrl}${refreshPath}`;
    const returnUrl = `${frontendUrl}${returnPath}`;

    const accountLink = await this.stripeService.createAccountLink(
      connectedAccount.stripeAccountId,
      refreshUrl,
      returnUrl,
    );

    return { onboardingUrl: accountLink.url };
  }
}
