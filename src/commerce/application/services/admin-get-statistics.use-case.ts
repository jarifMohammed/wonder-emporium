import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class AdminGetStatisticsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    // 1. Total Users
    const totalUsers = await this.prisma.authUser.count();

    // 2. Total Published Books
    const totalPublishedBooks = await this.prisma.book.count({
      where: {
        status: 'APPROVED',
      },
    });

    // 3. Total Sales (Orders count)
    const totalSales = await this.prisma.order.count({
      where: {
        status: 'COMPLETED',
      },
    });

    // 4. Gross Revenue
    const grossRevenueAggregation = await this.prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: 'COMPLETED',
      },
    });
    const totalGrossRevenue = grossRevenueAggregation._sum.totalAmount || 0;

    // 5. Net Platform Revenue
    const platformRevenueAggregation =
      await this.prisma.authorOrderPayout.aggregate({
        _sum: {
          platformFee: true,
        },
      });
    const totalPlatformRevenue =
      platformRevenueAggregation._sum.platformFee || 0;

    // 6. Platform Revenue by Day (last 30 days)
    const revenueByDayRaw = await this.prisma.$queryRaw<
      { day: Date; revenue: number }[]
    >`
      SELECT DATE("createdAt") as day, SUM("platformFee") as revenue
      FROM "AuthorOrderPayout"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY day ASC;
    `;
    const revenueByDay = revenueByDayRaw.map((row) => ({
      date: row.day.toISOString().split('T')[0],
      revenue: Number(row.revenue),
    }));

    // 7. Platform Revenue by Month
    const revenueByMonthRaw = await this.prisma.$queryRaw<
      { month: Date; revenue: number }[]
    >`
      SELECT DATE_TRUNC('month', "createdAt") as month, SUM("platformFee") as revenue
      FROM "AuthorOrderPayout"
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC;
    `;
    const revenueByMonth = revenueByMonthRaw.map((row) => ({
      month: row.month.toISOString().substring(0, 7), // YYYY-MM
      revenue: Number(row.revenue),
    }));

    return {
      totalUsers,
      totalPublishedBooks,
      totalSales,
      totalGrossRevenue,
      totalPlatformRevenue,
      revenueByDay,
      revenueByMonth,
    };
  }
}
