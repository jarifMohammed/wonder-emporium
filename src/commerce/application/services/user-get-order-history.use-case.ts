import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class UserGetOrderHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    buyerId: string,
    filters?: { status?: string; startDate?: string; endDate?: string },
  ) {
    const where: any = { buyerId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            book: {
              select: { title: true, bookCover: true },
            },
            format: {
              select: { formatType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
