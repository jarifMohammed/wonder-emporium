import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookStatus } from '../../domain/interfaces/book.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class ApproveBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(
    id: string,
    status: BookStatus.APPROVED | BookStatus.REJECTED,
  ): Promise<{ message: string }> {
    const existing = await this.bookRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Book not found');
    }

    if (!existing.book.canApprove()) {
      throw AppError.badRequest(
        'Only submitted books can be approved or rejected',
      );
    }

    await this.bookRepository.updateStatus(id, status);

    const message =
      status === BookStatus.APPROVED
        ? 'Book approved and published successfully'
        : 'Book has been rejected';

    return { message };
  }
}
