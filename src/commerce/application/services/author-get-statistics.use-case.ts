import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class AuthorGetStatisticsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(authorId: string) {
    // 1. Total Published Books
    const totalPublishedBooks = await this.prisma.book.count({
      where: {
        authorId,
        status: 'APPROVED',
      },
    });

    // 2. Total Sales (Orders quantity)
    const salesAggregation = await this.prisma.orderItem.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        authorId,
        order: {
          status: 'COMPLETED',
        },
      },
    });
    const totalSales = salesAggregation._sum.quantity || 0;

    // 3. Total Net Revenue
    const revenueAggregation = await this.prisma.authorOrderPayout.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        authorId,
      },
    });
    const totalRevenue = revenueAggregation._sum.amount || 0;

    // 4. Revenue by Day (last 30 days)
    const revenueByDayRaw = await this.prisma.$queryRaw<
      { day: Date; revenue: number }[]
    >`
      SELECT DATE("createdAt") as day, SUM(amount) as revenue
      FROM "AuthorOrderPayout"
      WHERE "authorId" = ${authorId}::uuid
      AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY day ASC;
    `;
    const revenueByDay = revenueByDayRaw.map((row) => ({
      date: row.day.toISOString().split('T')[0],
      revenue: Number(row.revenue),
    }));

    // 5. Revenue by Month
    const revenueByMonthRaw = await this.prisma.$queryRaw<
      { month: Date; revenue: number }[]
    >`
      SELECT DATE_TRUNC('month', "createdAt") as month, SUM(amount) as revenue
      FROM "AuthorOrderPayout"
      WHERE "authorId" = ${authorId}::uuid
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC;
    `;
    const revenueByMonth = revenueByMonthRaw.map((row) => ({
      month: row.month.toISOString().substring(0, 7), // YYYY-MM
      revenue: Number(row.revenue),
    }));

    return {
      totalPublishedBooks,
      totalSales,
      totalRevenue,
      revenueByDay,
      revenueByMonth,
    };
  }
}
