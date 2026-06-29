import { Inject, Injectable } from '@nestjs/common';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { ORDER_REPOSITORY_TOKEN } from '../../domain/interfaces/order.repository.interface';
import type { IOrderRepository } from '../../domain/interfaces/order.repository.interface';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/errors/app.error';

interface CheckoutItem {
  formatId: string;
  quantity: number;
}

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepository: IOrderRepository,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    buyerId: string,
    items: CheckoutItem[],
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkoutUrl: string }> {
    if (!items || items.length === 0) {
      throw AppError.badRequest('Cart is empty');
    }

    // 1. Fetch valid prices from database
    const lineItems: any[] = [];
    const orderItemsData: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const format = await this.prisma.bookFormatPricing.findUnique({
        where: { id: item.formatId },
        include: { book: true },
      });

      if (!format) {
        throw AppError.notFound(`Format not found: ${item.formatId}`);
      }

      const unitPriceCents = Math.round(format.listPrice * 100);
      subtotal += unitPriceCents * item.quantity;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${format.book.title} (${format.formatType})`,
            tax_code: 'txcd_99999999', // General digital/physical product tax code
          },
          unit_amount: unitPriceCents,
          tax_behavior: 'exclusive', // Add tax on top
        },
        quantity: item.quantity,
      });

      orderItemsData.push({
        bookId: format.bookId,
        formatId: format.id,
        authorId: format.book.authorId,
        unitPrice: format.listPrice,
        quantity: item.quantity,
        taxAmount: 0, // Stripe will calculate tax
        totalPrice: format.listPrice * item.quantity,
      });
    }

    // 2. Generate generic order ID to track in metadata
    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 3. Create Stripe Checkout Session
    const session = await this.stripeService.createCheckoutSession(
      lineItems,
      successUrl,
      cancelUrl,
      { order_internal_id: orderId, buyerId },
    );

    // 4. Save PENDING order locally
    await this.orderRepository.createOrder({
      buyerId,
      stripeSessionId: session.id,
      currency: 'usd',
      subtotal: subtotal / 100, // back to dollars
      taxAmount: 0, // Will be updated by webhook
      totalAmount: subtotal / 100, // Will be updated by webhook
      items: orderItemsData,
    });

    return { checkoutUrl: session.url! };
  }
}
