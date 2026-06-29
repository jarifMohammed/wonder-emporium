import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class AdminGetPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.authorOrderPayout.findMany({
      where,
      include: {
        author: {
          select: { email: true, username: true }
        },
        order: {
          select: { id: true, createdAt: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
