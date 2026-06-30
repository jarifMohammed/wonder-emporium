import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { IPrintRepository } from '../../domain/interfaces/print.repository.interface';
import {
  PrintEditionData,
  PrintJobData,
} from '../../domain/interfaces/lulu.types';

@Injectable()
export class PrismaPrintRepository implements IPrintRepository {
  private readonly logger = new Logger(PrismaPrintRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async updatePrintEdition(
    bookId: string,
    data: Partial<PrintEditionData>,
  ): Promise<void> {
    const existing = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { printEdition: true },
    });

    const current = (existing?.printEdition as PrintEditionData | null) || null;
    const merged: PrintEditionData = {
      enabled: data.enabled ?? current?.enabled ?? false,
      interiorPdfUrl: data.interiorPdfUrl ?? current?.interiorPdfUrl ?? '',
      coverPdfUrl: data.coverPdfUrl ?? current?.coverPdfUrl ?? '',
      pageCount: data.pageCount ?? current?.pageCount ?? 0,
      trimSize: data.trimSize ?? current?.trimSize ?? '',
      bindingType: data.bindingType ?? current?.bindingType ?? '',
      podPackageId: data.podPackageId ?? current?.podPackageId ?? '',
      pricing: {
        manufacturingCost:
          data.pricing?.manufacturingCost ??
          current?.pricing?.manufacturingCost ??
          0,
        currency: data.pricing?.currency ?? current?.pricing?.currency ?? 'USD',
        authorProfit:
          data.pricing?.authorProfit ?? current?.pricing?.authorProfit ?? 0,
        sellingPrice:
          data.pricing?.sellingPrice ?? current?.pricing?.sellingPrice ?? 0,
        lastCalculatedAt:
          data.pricing?.lastCalculatedAt ??
          current?.pricing?.lastCalculatedAt ??
          new Date().toISOString(),
      },
      validation: {
        interiorValidationId:
          data.validation?.interiorValidationId ??
          current?.validation?.interiorValidationId ??
          null,
        coverValidationId:
          data.validation?.coverValidationId ??
          current?.validation?.coverValidationId ??
          null,
        interiorStatus:
          data.validation?.interiorStatus ??
          current?.validation?.interiorStatus ??
          null,
        coverStatus:
          data.validation?.coverStatus ??
          current?.validation?.coverStatus ??
          null,
        validated:
          data.validation?.validated ?? current?.validation?.validated ?? false,
        validationErrors:
          data.validation?.validationErrors ??
          current?.validation?.validationErrors ??
          [],
        lastValidatedAt:
          data.validation?.lastValidatedAt ??
          current?.validation?.lastValidatedAt ??
          null,
      },
    };

    await this.prisma.book.update({
      where: { id: bookId },
      data: { printEdition: merged as any },
    });

    this.logger.log(`Print edition updated for book ${bookId}`);
  }

  async getPrintEdition(bookId: string): Promise<PrintEditionData | null> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { printEdition: true },
    });

    if (!book || !book.printEdition) return null;
    return book.printEdition as unknown as PrintEditionData;
  }

  async updatePrintJob(
    orderId: string,
    data: Partial<PrintJobData>,
  ): Promise<void> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { printJob: true, printCost: true },
    });

    if (!existing) {
      this.logger.warn(`Order ${orderId} not found for print job update`);
      return;
    }

    const current = (existing?.printJob as PrintJobData | null) || null;

    const merged: PrintJobData = {
      luluJobId: data.luluJobId ?? current?.luluJobId ?? 0,
      quantity: data.quantity ?? current?.quantity ?? 1,
      manufacturingCostAtPurchase:
        data.manufacturingCostAtPurchase ??
        current?.manufacturingCostAtPurchase ??
        0,
      shippingCost: data.shippingCost ?? current?.shippingCost ?? 0,
      status: data.status ?? current?.status ?? 'PENDING',
      tracking: data.tracking ?? current?.tracking ?? null,
      shippingLevel: data.shippingLevel ?? current?.shippingLevel ?? '',
    };

    const updateData: Record<string, unknown> = {
      printJob: merged as any,
    };
    if (data.manufacturingCostAtPurchase !== undefined) {
      updateData.printCost = data.manufacturingCostAtPurchase;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    this.logger.log(`Print job updated for order ${orderId}`);
  }

  async getPrintJob(orderId: string): Promise<PrintJobData | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { printJob: true },
    });

    if (!order || !order.printJob) return null;
    return order.printJob as unknown as PrintJobData;
  }
}
