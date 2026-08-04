import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class AdminGetOrdersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const orders = await this.prisma.order.findMany({
      include: {
        buyer: {
          include: {
            userProfile: true,
          },
        },
        items: {
          include: {
            book: {
              select: {
                title: true,
                bookCover: true,
              },
            },
            format: {
              select: {
                formatType: true,
              },
            },
          },
        },
        payouts: {
          include: {
            author: {
              include: {
                userProfile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const buyerName =
        `${order.buyer.userProfile?.firstName ?? ''} ${order.buyer.userProfile?.lastName ?? ''}`.trim() ||
        order.buyer.username ||
        order.buyer.email;

      const authorsMap = new Map<
        string,
        { id: string; name: string; email: string }
      >();

      for (const payout of order.payouts) {
        const authorName =
          `${payout.author.userProfile?.firstName ?? ''} ${payout.author.userProfile?.lastName ?? ''}`.trim() ||
          payout.author.username ||
          payout.author.email;

        authorsMap.set(payout.author.id, {
          id: payout.author.id,
          name: authorName,
          email: payout.author.email,
        });
      }

      return {
        id: order.id,
        stripeSessionId: order.stripeSessionId,
        status: order.status,
        currency: order.currency,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        createdAt: order.createdAt,
        buyer: {
          id: order.buyer.id,
          name: buyerName,
          email: order.buyer.email,
        },
        authors: Array.from(authorsMap.values()),
        items: order.items.map((item) => ({
          id: item.id,
          bookId: item.bookId,
          bookTitle: item.book.title,
          coverImageUrl: item.book.bookCover,
          formatId: item.formatId,
          formatType: item.format.formatType,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          authorId: item.authorId,
        })),
        payouts: order.payouts.map((payout) => ({
          id: payout.id,
          authorId: payout.authorId,
          amount: payout.amount,
          platformFee: payout.platformFee,
          status: payout.status,
        })),
      };
    });
  }
}
