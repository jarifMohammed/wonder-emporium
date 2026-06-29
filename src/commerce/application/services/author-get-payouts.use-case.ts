import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class AuthorGetPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(authorId: string, status?: string) {
    const where: any = { authorId };
    if (status) {
      where.status = status;
    }

    return this.prisma.authorOrderPayout.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            totalAmount: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
