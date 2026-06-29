import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IOrderRepository,
  CreateOrderData,
} from '../../domain/interfaces/order.repository.interface';
import { $Enums } from '@prisma/client';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(data: CreateOrderData): Promise<any> {
    return this.prisma.order.create({
      data: {
        buyerId: data.buyerId,
        stripeSessionId: data.stripeSessionId,
        currency: data.currency,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        status: $Enums.OrderStatus.PENDING,
        items: {
          create: data.items.map((item) => ({
            bookId: item.bookId,
            formatId: item.formatId,
            authorId: item.authorId,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            taxAmount: item.taxAmount,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getOrderById(orderId: string): Promise<any> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
  }

  async getOrderBySessionId(sessionId: string): Promise<any> {
    return this.prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: { items: true },
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: $Enums.OrderStatus,
  ): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async getOrderByPaymentIntentId(paymentIntentId: string): Promise<any> {
    return this.prisma.order.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { items: true },
    });
  }
}
