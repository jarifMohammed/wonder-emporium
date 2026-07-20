import { Book } from './book.entity';
import { BookStatus } from '../interfaces/book.interface';

const makeBook = (status: BookStatus) =>
  new Book(
    'book-id',
    'author-id',
    'Title',
    null,
    null,
    null,
    null,
    [],
    null,
    null,
    null,
    null,
    status,
    new Date(),
    new Date(),
  );

describe('Book status workflow', () => {
  it.each([BookStatus.DRAFT, BookStatus.REJECTED])(
    'allows %s books to be edited and submitted',
    (status) => {
      const book = makeBook(status);
      expect(book.isEditable()).toBe(true);
      expect(book.canSubmitForReview()).toBe(true);
    },
  );

  it.each([BookStatus.SUBMITTED, BookStatus.APPROVED])(
    'does not allow %s books to be edited or resubmitted',
    (status) => {
      const book = makeBook(status);
      expect(book.isEditable()).toBe(false);
      expect(book.canSubmitForReview()).toBe(false);
    },
  );
});
