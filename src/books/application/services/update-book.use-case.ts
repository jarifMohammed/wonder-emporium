import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookFileType } from '../../domain/interfaces/book.interface';
import { AppError } from '../../../common/errors/app.error';
import { UpdateBookInput, BookOutput } from '../dto/book.dto';

@Injectable()
export class UpdateBookUseCase {
  private readonly logger = new Logger(UpdateBookUseCase.name);

  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
    @InjectQueue('print-validation')
    private readonly validationQueue: Queue,
  ) {}

  async execute(
    id: string,
    userId: string,
    input: UpdateBookInput,
  ): Promise<BookOutput> {
    const existing = await this.bookRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Book not found');
    }

    if (existing.book.authorId !== userId) {
      throw AppError.forbidden('You can only update your own books');
    }

    if (!existing.book.isDraft()) {
      throw AppError.badRequest('Only draft books can be edited');
    }

    const result = await this.bookRepository.update(id, {
      title: input.title,
      description: input.description,
      bookCover: input.bookCover,
      isbn: input.isbn,
      category: input.category,
      tags: input.tags,
      language: input.language,
      ageGroup: input.ageGroup,
      formats: input.formats,
      authorEarnings: input.authorEarnings,
      publicationDetails: input.publicationDetails,
    });

    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        await this.bookRepository.addFile({
          bookId: id,
          type: file.type,
          url: file.url,
          fileKey: file.fileKey,
          mimeType: file.mimeType,
          size: file.size,
        });
      }
    }

    const printEdition = input.printEdition;
    const shouldRevalidate = !!(
      printEdition?.enabled &&
      (this.hasPdfFileChanged(input.files) ||
        printEdition.trimSize ||
        printEdition.paperType ||
        printEdition.bindingType ||
        printEdition.interiorColor ||
        printEdition.coverFinish)
    );

    if (shouldRevalidate && printEdition) {
      const files = await this.bookRepository.getFiles(id);
      const interiorPdf = files.find(
        (f) => f.type === BookFileType.INTERIOR_PDF,
      );
      const coverPdf = files.find((f) => f.type === BookFileType.COVER_PDF);

      if (interiorPdf?.url && coverPdf?.url) {
        const interiorFileName =
          interiorPdf.url.split('/').pop() || 'interior.pdf';
        const coverFileName = coverPdf.url.split('/').pop() || 'cover.pdf';
        const existingPrint = existing.book.printEdition as
          | Record<string, any>
          | undefined;

        await this.validationQueue.add(
          'validate-print-files',
          {
            bookId: id,
            interiorPdfUrl: interiorPdf.url,
            coverPdfUrl: coverPdf.url,
            interiorFileName,
            coverFileName,
            trimSize: printEdition.trimSize || existingPrint?.trimSize || '',
            bindingType:
              printEdition.bindingType || existingPrint?.bindingType || '',
            interiorColor:
              printEdition.interiorColor || existingPrint?.interiorColor || '',
            paperType: printEdition.paperType || existingPrint?.paperType || '',
            coverFinish:
              printEdition.coverFinish || existingPrint?.coverFinish || '',
            bookType: printEdition.bookType || '',
            printQuality: printEdition.printQuality || 'Standard',
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );

        this.logger.log(`Re-validation job enqueued for book ${id}`);
      }
    }

    const files = await this.bookRepository.getFiles(id);

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
      files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
    };

    const hasEbook = files.some((f) => f.type === BookFileType.EBOOK);
    const hasAudiobook = files.some((f) => f.type === BookFileType.AUDIOBOOK);
    output.ebookAvailable = hasEbook;
    output.audiobookAvailable = hasAudiobook;

    return output;
  }

  private hasPdfFileChanged(
    files?: { type: BookFileType; url: string }[],
  ): boolean {
    if (!files || files.length === 0) return false;
    return files.some(
      (f) =>
        f.type === BookFileType.INTERIOR_PDF ||
        f.type === BookFileType.COVER_PDF,
    );
  }
}
