import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class AuthorRequestPayoutUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(authorId: string, payoutId: string) {
    const payout = await this.prisma.authorOrderPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw AppError.notFound('Payout record not found');
    }

    if (payout.authorId !== authorId) {
      throw AppError.forbidden('You do not own this payout');
    }

    if (payout.status !== 'PENDING_REQUEST') {
      throw AppError.badRequest(`Payout cannot be requested in status: ${payout.status}`);
    }

    const updatedPayout = await this.prisma.authorOrderPayout.update({
      where: { id: payoutId },
      data: { status: 'REQUESTED' },
    });

    return updatedPayout;
  }
}
