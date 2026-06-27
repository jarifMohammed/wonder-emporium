import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookStatus } from '../../domain/interfaces/book.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class SubmitBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(id: string, userId: string): Promise<{ message: string }> {
    const existing = await this.bookRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Book not found');
    }

    if (existing.book.authorId !== userId) {
      throw AppError.forbidden('You can only submit your own books');
    }

    if (!existing.book.canSubmitForReview()) {
      throw AppError.badRequest('Only draft books can be submitted for review');
    }

    await this.bookRepository.updateStatus(id, BookStatus.SUBMITTED);

    return { message: 'Book submitted for review successfully' };
  }
}
