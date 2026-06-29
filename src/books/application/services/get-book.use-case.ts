import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { AppError } from '../../../common/errors/app.error';
import { BookOutput } from '../dto/book.dto';

@Injectable()
export class GetBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(id: string): Promise<BookOutput> {
    const result = await this.bookRepository.findById(id);
    if (!result) {
      throw AppError.notFound('Book not found');
    }

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
      formats: result.formats,
      authorEarnings: result.book.authorEarnings,
      publicationDetails: result.book.publicationDetails,
      status: result.book.status,
      files: result.files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
    };
  }
}
