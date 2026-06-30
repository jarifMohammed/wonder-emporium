import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { HandleCheckoutCompletedUseCase } from '../../application/services/handle-checkout-completed.use-case';
import { SyncConnectAccountUseCase } from '../../application/services/sync-connect-account.use-case';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import Stripe from 'stripe';

@ApiTags('Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly handleCheckoutCompletedUseCase: HandleCheckoutCompletedUseCase,
    private readonly syncConnectAccountUseCase: SyncConnectAccountUseCase,
    private readonly configService: ConfigService,
  ) {}

  // ─── Helper: verify + parse ──────────────────────────────────────────────────

  private constructEvent(
    req: Request,
    res: Response,
    secretEnvKey: string,
  ): Stripe.Event | null {
    const webhookSecret = this.configService.get<string>(secretEnvKey);
    if (!webhookSecret) {
      this.logger.error(
        `Stripe webhook secret "${secretEnvKey}" is not configured`,
      );
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Webhook Secret missing');
      return null;
    }

    const signature = req.headers['stripe-signature'] as string;
    try {
      // Use req.rawBody if available (requires rawBody: true in main.ts)
      const payload = (req as any).rawBody || req.body;
      return this.stripeService.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      res
        .status(HttpStatus.BAD_REQUEST)
        .send(`Webhook Error: ${error.message}`);
      return null;
    }
  }

  // ─── POST /webhooks/stripe ───────────────────────────────────────────────────
  // Standard checkout events.
  // Register in Stripe Dashboard → Developers → Webhooks → "Add endpoint"
  //   URL:    https://your-api.com/webhooks/stripe
  //   Events: checkout.session.completed
  //   Secret: STRIPE_WEBHOOK_SECRET

  @Post()
  @ApiOperation({ summary: 'Stripe standard checkout webhook' })
  async handleCheckoutWebhook(@Req() req: Request, @Res() res: Response) {
    const event = this.constructEvent(req, res, 'STRIPE_WEBHOOK_SECRET');
    if (!event) return;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await this.handleCheckoutCompletedUseCase.execute(session);
          break;
        }
        case 'payment_intent.payment_failed': {
          const intent = event.data.object;
          const order = await this.handleCheckoutCompletedUseCase[
            'orderRepository'
          ].getOrderByPaymentIntentId(intent.id);
          if (order && order.status === 'PENDING') {
            await this.handleCheckoutCompletedUseCase[
              'orderRepository'
            ].updateOrderStatus(order.id, 'FAILED');
            this.logger.warn(`Payment failed for order ${order.id}`);
          }
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object;
          const order = await this.handleCheckoutCompletedUseCase[
            'orderRepository'
          ].getOrderBySessionId(session.id);
          if (order && order.status === 'PENDING') {
            await this.handleCheckoutCompletedUseCase[
              'orderRepository'
            ].updateOrderStatus(order.id, 'FAILED');
            this.logger.warn(`Checkout session expired for order ${order.id}`);
          }
          break;
        }
        default:
          this.logger.log(`Unhandled checkout event type: ${event.type}`);
      }
      res.status(HttpStatus.OK).json({ received: true });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error processing checkout webhook: ${error.message}`);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(`Error: ${error.message}`);
    }
  }

  // ─── POST /webhooks/stripe/connect ───────────────────────────────────────────
  // Stripe Connect account events (author onboarding status).
  // Register in Stripe Dashboard → Developers → Webhooks → "Add endpoint"
  //   Select account type: "Connect" (not "Your account")
  //   URL:    https://your-api.com/webhooks/stripe/connect
  //   Events: account.updated, capability.updated, account.application.deauthorized
  //   Secret: STRIPE_CONNECT_WEBHOOK_SECRET

  @Post('connect')
  @ApiOperation({ summary: 'Stripe Connect account webhook' })
  async handleConnectWebhook(@Req() req: Request, @Res() res: Response) {
    const event = this.constructEvent(
      req,
      res,
      'STRIPE_CONNECT_WEBHOOK_SECRET',
    );
    if (!event) return;

    try {
      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object;
          this.logger.log(`Connect: account.updated for ${account.id}`);
          await this.syncConnectAccountUseCase.execute(
            account.id,
            account.charges_enabled,
            account.payouts_enabled,
          );
          break;
        }
        case 'capability.updated': {
          const capability = event.data.object;
          this.logger.log(`Capability updated: ${capability.id}`);
          const account = await this.stripeService.retrieveAccount(
            capability.account as string,
          );
          await this.syncConnectAccountUseCase.execute(
            account.id,
            account.charges_enabled,
            account.payouts_enabled,
          );
          break;
        }
        case 'account.application.deauthorized': {
          // Stripe types this event's data.object as Application, not Account.
          // The connected account ID is available on event.account for Connect events.
          const accountId = event.account;
          if (accountId) {
            this.logger.log(`Account deauthorized: ${accountId}`);
            await this.syncConnectAccountUseCase.execute(
              accountId,
              false,
              false,
            );
          }
          break;
        }
        // Handle other events like payment_intent.succeeded etc if needed
        default:
          this.logger.log(`Unhandled event type ${event.type}`);
      }
      res.status(HttpStatus.OK).json({ received: true });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error processing webhook: ${error.message}`);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(`Error processing webhook: ${error.message}`);
    }
  }
}
