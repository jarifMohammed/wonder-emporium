import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import {
  BookStatus,
  BookFileType,
} from '../../domain/interfaces/book.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../../auth/domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../../auth/domain/interfaces/auth-user.repository.interface';
import { CreateBookInput, BookOutput } from '../dto/book.dto';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class CreateBookUseCase {
  private readonly logger = new Logger(CreateBookUseCase.name);

  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @InjectQueue('print-validation')
    private readonly validationQueue: Queue,
  ) {}

  async execute(input: CreateBookInput): Promise<BookOutput> {
    const user = await this.userRepository.findById(input.authorId);
    if (!user) {
      throw AppError.notFound('Author not found');
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden(
        'Your account must be approved before listing books.',
      );
    }

    const result = await this.bookRepository.create({
      authorId: input.authorId,
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
      status: input.status ?? BookStatus.DRAFT,
    });

    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        await this.bookRepository.addFile({
          bookId: result.book.id,
          type: file.type,
          url: file.url,
          fileKey: file.fileKey,
          mimeType: file.mimeType,
          size: file.size,
        });
      }
    }

    if (input.printEdition?.enabled) {
      await this.handlePrintEdition(result.book.id, input);
    }

    const files = await this.bookRepository.getFiles(result.book.id);

    const output = this.toBookOutput(result, files);
    output.printEdition = undefined;

    if (input.printEdition?.enabled) {
      output.printAvailable = true;
    }

    const hasEbook = files.some((f) => f.type === BookFileType.EBOOK);
    const hasAudiobook = files.some((f) => f.type === BookFileType.AUDIOBOOK);
    output.ebookAvailable =
      hasEbook ||
      (result.formats ?? []).some((f: any) => f.formatType === 'EBOOK');
    output.audiobookAvailable = hasAudiobook;

    return output;
  }

  private async handlePrintEdition(
    bookId: string,
    input: CreateBookInput,
  ): Promise<void> {
    const printEdition = input.printEdition!;

    const interiorPdfFile = input.files?.find(
      (f) => f.type === BookFileType.INTERIOR_PDF,
    );
    const coverPdfFile = input.files?.find(
      (f) => f.type === BookFileType.COVER_PDF,
    );

    if (!interiorPdfFile || !coverPdfFile) {
      throw AppError.badRequest(
        'Interior PDF and Cover PDF files are required for print edition',
      );
    }

    const interiorFileName =
      interiorPdfFile.url.split('/').pop() || 'interior.pdf';
    const coverFileName = coverPdfFile.url.split('/').pop() || 'cover.pdf';

    await this.validationQueue.add(
      'validate-print-files',
      {
        bookId,
        interiorPdfUrl: interiorPdfFile.url,
        coverPdfUrl: coverPdfFile.url,
        interiorFileName,
        coverFileName,
        trimSize: printEdition.trimSize,
        bindingType: printEdition.bindingType,
        interiorColor: printEdition.interiorColor,
        paperType: printEdition.paperType,
        coverFinish: printEdition.coverFinish,
        bookType: printEdition.bookType,
        printQuality: printEdition.printQuality || 'Standard',
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(`Print validation job enqueued for book ${bookId}`);
  }

  private toBookOutput(result: any, files: any[]): BookOutput {
    return {
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
      formats: result.formats ?? [],
      authorEarnings: result.book.authorEarnings,
      publicationDetails: result.book.publicationDetails,
      status: result.book.status,
      files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
    };
  }
}
