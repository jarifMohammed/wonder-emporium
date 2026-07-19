import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/errors/app.error';
import { S3FileStorageService } from '../../../books/infrastructure/storage/s3-file-storage.service';
import { DigitalFormatType, LibraryAccessOutput } from '../dto/library.dto';

const URL_EXPIRY_SECONDS = 300;
const DIGITAL_FORMATS: DigitalFormatType[] = ['EBOOK', 'AUDIOBOOK'];

@Injectable()
export class GetLibraryAccessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: S3FileStorageService,
  ) {}

  async execute(
    buyerId: string,
    orderItemId: string,
  ): Promise<LibraryAccessOutput> {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { buyerId, status: 'COMPLETED' },
      },
      include: {
        book: {
          select: {
            id: true,
            files: {
              select: {
                type: true,
                fileKey: true,
                mimeType: true,
              },
            },
          },
        },
        format: { select: { formatType: true } },
      },
    });

    if (!item) {
      // Do not reveal whether another user owns this item.
      throw AppError.notFound('Purchased library item not found');
    }

    const format = item.format.formatType.toUpperCase();
    if (!DIGITAL_FORMATS.includes(format as DigitalFormatType)) {
      throw AppError.badRequest(
        'This purchase is a physical format and has no digital access URL',
      );
    }

    const digitalFormat = format as DigitalFormatType;
    const file = item.book.files.find((candidate) => {
      return candidate.type === digitalFormat;
    });

    if (!file?.fileKey) {
      throw AppError.notFound('Digital file is not available for this book');
    }

    const url = await this.fileStorage.createDownloadUrl(
      file.fileKey,
      URL_EXPIRY_SECONDS,
    );

    return {
      orderItemId: item.id,
      bookId: item.book.id,
      format: digitalFormat,
      accessType: digitalFormat === 'AUDIOBOOK' ? 'STREAM' : 'DOWNLOAD',
      url,
      expiresIn: URL_EXPIRY_SECONDS,
      mimeType: file.mimeType,
      fileName: file.fileKey.split('/').pop() || `${item.book.id}-${format}`,
    };
  }
}
