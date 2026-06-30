import { Injectable } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  IBookRepository,
  CreateBookData,
  UpdateBookData,
  CreateFileData,
  BookWithFilesAndFormats,
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
  language: string | null;
  ageGroup: string | null;
  authorEarnings: number | null;
  publicationDetails: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  printEdition: any;
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

interface PrismaBookFormatPricing {
  id: string;
  bookId: string;
  formatType: string;
  listPrice: number;
  sku: string | null;
  pageCount: number | null;
  trimSize: string | null;
  coverUrl: string | null;
  interiorUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaBookRepository implements IBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookData): Promise<BookWithFilesAndFormats> {
    const book = await this.prisma.book.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        description: data.description,
        bookCover: data.bookCover,
        isbn: data.isbn,
        category: data.category,
        tags: data.tags ?? [],
        language: data.language,
        ageGroup: data.ageGroup,
        authorEarnings: data.authorEarnings,
        publicationDetails: data.publicationDetails,
        status: (data.status ?? BookStatus.DRAFT) as $Enums.BookStatus,
        formats: data.formats
          ? {
              create: data.formats.map((f) => ({
                formatType: f.formatType,
                listPrice: f.listPrice,
                sku: f.sku,
                pageCount: f.pageCount,
                trimSize: f.trimSize,
                coverUrl: f.coverUrl,
                interiorUrl: f.interiorUrl,
              })),
            }
          : undefined,
      },
      include: { files: true, formats: true },
    });

    return this.toBookWithFilesAndFormats(
      book as unknown as PrismaBook,
      (book as any).files as PrismaBookFile[],
      (book as any).formats as PrismaBookFormatPricing[],
    );
  }

  async findById(id: string): Promise<BookWithFilesAndFormats | null> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { files: true, formats: true },
    });
    if (!book) return null;
    return this.toBookWithFilesAndFormats(
      book as unknown as PrismaBook,
      book.files as PrismaBookFile[],
      (book as any).formats as PrismaBookFormatPricing[],
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
        include: { files: true, formats: true },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      books: books.map((b) =>
        this.toBookWithFilesAndFormats(
          b as unknown as PrismaBook,
          (b as any).files as PrismaBookFile[],
          (b as any).formats as PrismaBookFormatPricing[],
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

  async update(
    id: string,
    data: UpdateBookData,
  ): Promise<BookWithFilesAndFormats> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.bookCover !== undefined) updateData.bookCover = data.bookCover;
    if (data.isbn !== undefined) updateData.isbn = data.isbn;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.ageGroup !== undefined) updateData.ageGroup = data.ageGroup;
    if (data.authorEarnings !== undefined)
      updateData.authorEarnings = data.authorEarnings;
    if (data.publicationDetails !== undefined)
      updateData.publicationDetails = data.publicationDetails;

    if (data.formats !== undefined) {
      updateData.formats = {
        deleteMany: {},
        create: data.formats.map((f) => ({
          formatType: f.formatType,
          listPrice: f.listPrice,
          sku: f.sku,
          pageCount: f.pageCount,
          trimSize: f.trimSize,
          coverUrl: f.coverUrl,
          interiorUrl: f.interiorUrl,
        })),
      };
    }

    const book = await this.prisma.book.update({
      where: { id },
      data: updateData,
      include: { files: true, formats: true },
    });

    return this.toBookWithFilesAndFormats(
      book as unknown as PrismaBook,
      book.files as PrismaBookFile[],
      (book as any).formats as PrismaBookFormatPricing[],
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
      book.language,
      book.ageGroup,
      book.authorEarnings,
      book.publicationDetails,
      book.status as BookStatus,
      book.createdAt,
      book.updatedAt,
      book.printEdition,
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

  private toBookWithFilesAndFormats(
    book: PrismaBook,
    files: PrismaBookFile[],
    formats: PrismaBookFormatPricing[] = [],
  ): BookWithFilesAndFormats {
    return {
      book: this.toDomain(book),
      files: files.map((f) => this.toFileData(f)),
      formats: formats.map((f) => ({
        id: f.id,
        bookId: f.bookId,
        formatType: f.formatType,
        listPrice: f.listPrice,
        sku: f.sku,
        pageCount: f.pageCount,
        trimSize: f.trimSize,
        coverUrl: f.coverUrl,
        interiorUrl: f.interiorUrl,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    };
  }
}
