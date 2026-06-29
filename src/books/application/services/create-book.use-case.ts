import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookStatus } from '../../domain/interfaces/book.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../../auth/domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../../auth/domain/interfaces/auth-user.repository.interface';
import { CreateBookInput, BookOutput } from '../dto/book.dto';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class CreateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(input: CreateBookInput): Promise<BookOutput> {
    const user = await this.userRepository.findById(input.authorId);
    if (!user) {
      throw AppError.notFound('Author not found');
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Your account must be approved before listing books.');
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

    const files = await this.bookRepository.getFiles(result.book.id);

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
      files,
      createdAt: result.book.createdAt,
      updatedAt: result.book.updatedAt,
    };
  }
}
