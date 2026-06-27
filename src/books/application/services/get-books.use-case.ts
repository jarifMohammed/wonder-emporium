import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY_TOKEN } from '../../domain/interfaces/book.repository.interface';
import type { IBookRepository } from '../../domain/interfaces/book.repository.interface';
import { BookStatus } from '../../domain/interfaces/book.interface';
import { BookFiltersInput, PaginatedBooksOutput } from '../dto/book.dto';

@Injectable()
export class GetBooksUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY_TOKEN)
    private readonly bookRepository: IBookRepository,
  ) {}

  async execute(filters: BookFiltersInput): Promise<PaginatedBooksOutput> {
    const result = await this.bookRepository.findAll({
      ...filters,
    });

    return {
      books: result.books.map((b) => ({
        id: b.book.id,
        authorId: b.book.authorId,
        title: b.book.title,
        description: b.book.description,
        bookCover: b.book.bookCover,
        isbn: b.book.isbn,
        category: b.book.category,
        tags: b.book.tags,
        pageCount: b.book.pageCount,
        trimSize: b.book.trimSize,
        language: b.book.language,
        ageGroup: b.book.ageGroup,
        listPrice: b.book.listPrice,
        authorEarnings: b.book.authorEarnings,
        publicationDetails: b.book.publicationDetails,
        status: b.book.status,
        files: b.files,
        createdAt: b.book.createdAt,
        updatedAt: b.book.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getApproved(filters: BookFiltersInput): Promise<PaginatedBooksOutput> {
    return this.execute({ ...filters, status: BookStatus.APPROVED });
  }

  async getPending(filters: BookFiltersInput): Promise<PaginatedBooksOutput> {
    return this.execute({ ...filters, status: BookStatus.SUBMITTED });
  }

  async getByAuthor(
    authorId: string,
    filters: BookFiltersInput,
  ): Promise<PaginatedBooksOutput> {
    const result = await this.bookRepository.findByAuthorId(authorId, filters);

    return {
      books: result.books.map((b) => ({
        id: b.book.id,
        authorId: b.book.authorId,
        title: b.book.title,
        description: b.book.description,
        bookCover: b.book.bookCover,
        isbn: b.book.isbn,
        category: b.book.category,
        tags: b.book.tags,
        pageCount: b.book.pageCount,
        trimSize: b.book.trimSize,
        language: b.book.language,
        ageGroup: b.book.ageGroup,
        listPrice: b.book.listPrice,
        authorEarnings: b.book.authorEarnings,
        publicationDetails: b.book.publicationDetails,
        status: b.book.status,
        files: b.files,
        createdAt: b.book.createdAt,
        updatedAt: b.book.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
