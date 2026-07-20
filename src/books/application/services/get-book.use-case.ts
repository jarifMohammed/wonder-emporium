import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookFileType } from '../../domain/interfaces/book.interface';
import { AppError } from '../../../common/errors/app.error';
import { BookOutput } from '../dto/book.dto';
import { userRole } from '../../../auth/interfaces/auth.interface';

@Injectable()
export class GetBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(
    id: string,
    requester?: { id: string; role: userRole },
  ): Promise<BookOutput> {
    const result = await this.bookRepository.findById(id);
    if (!result) {
      throw AppError.notFound('Book not found');
    }

    const canViewPrivate =
      requester?.id === result.book.authorId ||
      requester?.role === userRole.ADMIN ||
      requester?.role === userRole.SUPERADMIN ||
      requester?.role === userRole.MODERATOR;
    if (!result.book.isApproved() && !canViewPrivate) {
      throw AppError.notFound('Book not found');
    }

    const hasEbook = result.files.some((f) => f.type === BookFileType.EBOOK);
    const hasAudiobook = result.files.some(
      (f) => f.type === BookFileType.AUDIOBOOK,
    );
    const printEdition = (result.book as any).printEdition;
    const isPrintEnabled = printEdition?.enabled === true;
    const isAuthorOrAdmin = canViewPrivate;

    const output: BookOutput = {
      id: result.book.id,
      authorId: result.book.authorId,
      title: result.book.title,
      description: result.book.description,
      bookCover: result.book.bookCover,
      isbn: result.book.isbn,
      category: result.book.category,
      tags: result.book.tags,
      language: result.book.language,
      ageGroup: result.book.ageGroup,
      formats: result.formats,
      authorEarnings: result.book.authorEarnings,
      publicationDetails: result.book.publicationDetails,
      status: result.book.status,
      files: result.files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
      printAvailable: isPrintEnabled,
      ebookAvailable: hasEbook,
      audiobookAvailable: hasAudiobook,
      sellingPrice: isPrintEnabled
        ? printEdition?.pricing?.sellingPrice
        : undefined,
    };

    if (isAuthorOrAdmin && isPrintEnabled) {
      output.printEdition = {
        enabled: printEdition.enabled,
        interiorPdfUrl: printEdition.interiorPdfUrl,
        coverPdfUrl: printEdition.coverPdfUrl,
        pageCount: printEdition.pageCount,
        trimSize: printEdition.trimSize,
        bindingType: printEdition.bindingType,
        podPackageId: printEdition.podPackageId,
        pricing: {
          manufacturingCost: printEdition.pricing?.manufacturingCost,
          currency: printEdition.pricing?.currency,
          authorProfit: printEdition.pricing?.authorProfit,
          sellingPrice: printEdition.pricing?.sellingPrice,
          lastCalculatedAt: printEdition.pricing?.lastCalculatedAt,
        },
        validation: {
          interiorValidationId: printEdition.validation?.interiorValidationId,
          coverValidationId: printEdition.validation?.coverValidationId,
          interiorStatus: printEdition.validation?.interiorStatus,
          coverStatus: printEdition.validation?.coverStatus,
          validated: printEdition.validation?.validated,
          validationErrors: printEdition.validation?.validationErrors,
          lastValidatedAt: printEdition.validation?.lastValidatedAt,
        },
      };
    }

    return output;
  }
}
