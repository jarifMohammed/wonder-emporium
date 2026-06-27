import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { AppError } from '../../../common/errors/app.error';
import { UpdateBookInput, BookOutput } from '../dto/book.dto';

@Injectable()
export class UpdateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
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
      pageCount: input.pageCount,
      trimSize: input.trimSize,
      language: input.language,
      ageGroup: input.ageGroup,
      listPrice: input.listPrice,
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

    const files = await this.bookRepository.getFiles(id);

    return {
      id: result.book.id,
      authorId: result.book.authorId,
      title: result.book.title,
      description: result.book.description,
      bookCover: result.book.bookCover,
      isbn: result.book.isbn,
      category: result.book.category,
      tags: result.book.tags,
      pageCount: result.book.pageCount,
      trimSize: result.book.trimSize,
      language: result.book.language,
      ageGroup: result.book.ageGroup,
      listPrice: result.book.listPrice,
      authorEarnings: result.book.authorEarnings,
      publicationDetails: result.book.publicationDetails,
      status: result.book.status,
      files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
    };
  }
}
