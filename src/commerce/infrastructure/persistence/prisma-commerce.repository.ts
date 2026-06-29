import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  ICommerceRepository,
  StripeConnectedAccountData,
} from '../../domain/interfaces/commerce.repository.interface';

@Injectable()
export class PrismaCommerceRepository implements ICommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getConnectedAccountByAuthId(
    authId: string,
  ): Promise<StripeConnectedAccountData | null> {
    return this.prisma.stripeConnectedAccount.findUnique({
      where: { authId },
    });
  }

  async getConnectedAccountByStripeId(
    stripeAccountId: string,
  ): Promise<StripeConnectedAccountData | null> {
    return this.prisma.stripeConnectedAccount.findUnique({
      where: { stripeAccountId },
    });
  }

  async createConnectedAccount(
    authId: string,
    stripeAccountId: string,
  ): Promise<StripeConnectedAccountData> {
    return this.prisma.stripeConnectedAccount.create({
      data: {
        authId,
        stripeAccountId,
      },
    });
  }

  async updateConnectedAccountStatus(
    stripeAccountId: string,
    chargesEnabled: boolean,
    payoutsEnabled: boolean,
  ): Promise<void> {
    await this.prisma.stripeConnectedAccount.update({
      where: { stripeAccountId },
      data: {
        chargesEnabled,
        payoutsEnabled,
      },
    });
  }

  async incrementPendingBalance(authId: string, amount: number): Promise<void> {
    await this.prisma.stripeConnectedAccount.update({
      where: { authId },
      data: {
        pendingBalance: {
          increment: amount,
        },
      },
    });
  }
}
