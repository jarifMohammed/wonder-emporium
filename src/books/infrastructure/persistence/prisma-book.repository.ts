import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IBookRepository,
  CreateBookData,
  UpdateBookData,
  CreateFileData,
  BookWithFiles,
  PaginatedBooks,
} from '../../domain/interfaces/book.repository.interface';
import {
  BookStatus,
  BookFileType,
  BookFileData,
  BookFilters,
} from '../../domain/interfaces/book.interface';
import { Book } from '../../domain/entities/book.entity';

interface PrismaBook {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  bookCover: string | null;
  isbn: string | null;
  category: string | null;
  tags: string[];
  pageCount: number | null;
  trimSize: string | null;
  language: string | null;
  ageGroup: string | null;
  listPrice: number | null;
  authorEarnings: number | null;
  publicationDetails: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaBookFile {
  id: string;
  bookId: string;
  type: string;
  url: string | null;
  fileKey: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
}

@Injectable()
export class PrismaBookRepository implements IBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookData): Promise<BookWithFiles> {
    const book = await this.prisma.book.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        description: data.description,
        bookCover: data.bookCover,
        isbn: data.isbn,
        category: data.category,
        tags: data.tags ?? [],
        pageCount: data.pageCount,
        trimSize: data.trimSize,
        language: data.language,
        ageGroup: data.ageGroup,
        listPrice: data.listPrice,
        authorEarnings: data.authorEarnings,
        publicationDetails: data.publicationDetails,
        status: (data.status ?? BookStatus.DRAFT) as $Enums.BookStatus,
      },
    });

    return this.toBookWithFiles(book as PrismaBook, []);
  }

  async findById(id: string): Promise<BookWithFiles | null> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!book) return null;
    return this.toBookWithFiles(
      book as PrismaBook,
      book.files as PrismaBookFile[],
    );
  }

  async findAll(filters: BookFilters): Promise<PaginatedBooks> {
    const where: Record<string, unknown> = {};
    const orderBy: Record<string, string> = {};

    if (filters.status) where.status = filters.status;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.category) where.category = filters.category;
    if (filters.language) where.language = filters.language;
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder ?? 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { files: true },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      books: books.map((b) =>
        this.toBookWithFiles(
          b as PrismaBook,
          (b as any).files as PrismaBookFile[],
        ),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByAuthorId(
    authorId: string,
    filters: BookFilters,
  ): Promise<PaginatedBooks> {
    return this.findAll({ ...filters, authorId });
  }

  async update(id: string, data: UpdateBookData): Promise<BookWithFiles> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.bookCover !== undefined) updateData.bookCover = data.bookCover;
    if (data.isbn !== undefined) updateData.isbn = data.isbn;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.pageCount !== undefined) updateData.pageCount = data.pageCount;
    if (data.trimSize !== undefined) updateData.trimSize = data.trimSize;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.ageGroup !== undefined) updateData.ageGroup = data.ageGroup;
    if (data.listPrice !== undefined) updateData.listPrice = data.listPrice;
    if (data.authorEarnings !== undefined)
      updateData.authorEarnings = data.authorEarnings;
    if (data.publicationDetails !== undefined)
      updateData.publicationDetails = data.publicationDetails;

    const book = await this.prisma.book.update({
      where: { id },
      data: updateData,
      include: { files: true },
    });

    return this.toBookWithFiles(
      book as PrismaBook,
      book.files as PrismaBookFile[],
    );
  }

  async updateStatus(id: string, status: BookStatus): Promise<void> {
    await this.prisma.book.update({
      where: { id },
      data: { status: status as $Enums.BookStatus },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.book.delete({ where: { id } });
  }

  async addFile(data: CreateFileData): Promise<BookFileData> {
    const file = await this.prisma.bookFile.create({
      data: {
        bookId: data.bookId,
        type: data.type as $Enums.BookFileType,
        url: data.url,
        fileKey: data.fileKey,
        mimeType: data.mimeType,
        size: data.size,
      },
    });
    return this.toFileData(file as PrismaBookFile);
  }

  async getFiles(bookId: string): Promise<BookFileData[]> {
    const files = await this.prisma.bookFile.findMany({ where: { bookId } });
    return files.map((f) => this.toFileData(f as PrismaBookFile));
  }

  private toDomain(book: PrismaBook): Book {
    return new Book(
      book.id,
      book.authorId,
      book.title,
      book.description,
      book.bookCover,
      book.isbn,
      book.category,
      book.tags,
      book.pageCount,
      book.trimSize,
      book.language,
      book.ageGroup,
      book.listPrice,
      book.authorEarnings,
      book.publicationDetails,
      book.status as BookStatus,
      book.createdAt,
      book.updatedAt,
    );
  }

  private toFileData(file: PrismaBookFile): BookFileData {
    return {
      id: file.id,
      bookId: file.bookId,
      type: file.type as BookFileType,
      url: file.url,
      fileKey: file.fileKey,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    };
  }

  private toBookWithFiles(
    book: PrismaBook,
    files: PrismaBookFile[],
  ): BookWithFiles {
    return {
      book: this.toDomain(book),
      files: files.map((f) => this.toFileData(f)),
    };
  }
}
