import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { DigitalFormatType, LibraryItemOutput } from '../dto/library.dto';

const DIGITAL_FORMATS: DigitalFormatType[] = ['EBOOK', 'AUDIOBOOK'];

@Injectable()
export class GetUserLibraryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(buyerId: string): Promise<LibraryItemOutput[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { buyerId, status: 'COMPLETED' },
        format: { formatType: { in: DIGITAL_FORMATS } },
      },
      include: {
        order: { select: { id: true, createdAt: true } },
        book: {
          select: {
            id: true,
            title: true,
            bookCover: true,
            authorId: true,
          },
        },
        format: { select: { id: true, formatType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => {
      const format = item.format.formatType as DigitalFormatType;
      return {
        orderItemId: item.id,
        orderId: item.order.id,
        purchasedAt: item.order.createdAt,
        quantity: item.quantity,
        book: item.book,
        format: { id: item.format.id, type: format },
        accessType: format === 'AUDIOBOOK' ? 'STREAM' : 'DOWNLOAD',
      };
    });
  }
}
