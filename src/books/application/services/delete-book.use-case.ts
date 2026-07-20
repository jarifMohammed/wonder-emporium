import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class DeleteBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<{ message: string }> {
    const existing = await this.bookRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Book not found');
    }

    if (existing.book.authorId !== userId && !isAdmin) {
      throw AppError.forbidden('You can only delete your own books');
    }

    await this.bookRepository.delete(id);

    return { message: 'Book deleted successfully' };
  }
}
