import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    // Defaulting to a test key if not provided to avoid crash in boilerplate
    this.stripe = new Stripe(secretKey || 'sk_test_123', {
      apiVersion: '2023-10-16' as any, // fallback type casting
    });
  }

  async createConnectAccount(
    email: string,
    country = 'US',
  ): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      country,
      email,
      controller: {
        losses: {
          payments: 'application',
        },
        fees: {
          payer: 'application',
        },
        requirement_collection: 'stripe',
        stripe_dashboard: {
          type: 'express',
        },
      },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: 'individual',
    });
  }

  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  async createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
    return this.stripe.accounts.createLoginLink(accountId);
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve(accountId);
  }

  async createCheckoutSession(
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'IE'], // Add supported shipping countries
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  }

  async createTransfer(
    amount: number,
    currency: string,
    destination: string,
    description: string,
  ): Promise<Stripe.Transfer> {
    return this.stripe.transfers.create({
      amount,
      currency,
      destination,
      description,
    });
  }

  constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
