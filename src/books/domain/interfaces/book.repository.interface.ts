import {
  BookStatus,
  BookFileType,
  BookFileData,
  BookFormatData,
  BookFilters,
} from './book.interface';
import { Book } from '../entities/book.entity';

export interface CreateBookData {
  authorId: string;
  title: string;
  description?: string;
  bookCover?: string;
  isbn?: string;
  category?: string;
  tags?: string[];
  language?: string;
  ageGroup?: string;
  formats?: {
    formatType: string;
    listPrice: number;
    sku?: string;
    pageCount?: number;
    trimSize?: string;
    coverUrl?: string;
    interiorUrl?: string;
  }[];
  authorEarnings?: number;
  publicationDetails?: string;
  status?: BookStatus;
}

export interface UpdateBookData {
  title?: string;
  description?: string;
  bookCover?: string;
  isbn?: string;
  category?: string;
  tags?: string[];
  language?: string;
  ageGroup?: string;
  formats?: {
    formatType: string;
    listPrice: number;
    sku?: string;
    pageCount?: number;
    trimSize?: string;
    coverUrl?: string;
    interiorUrl?: string;
  }[];
  authorEarnings?: number;
  publicationDetails?: string;
}

export interface CreateFileData {
  bookId: string;
  type: BookFileType;
  url?: string;
  fileKey?: string;
  mimeType?: string;
  size?: number;
}

export interface BookAuthorData {
  id: string;
  username: string;
  email: string;
  isFoundingAuthor: boolean;
  profile: {
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface BookWithFilesAndFormats {
  book: Book;
  files: BookFileData[];
  formats: BookFormatData[];
  author?: BookAuthorData;
}

export interface PaginatedBooks {
  books: BookWithFilesAndFormats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookCategoryCount {
  name: string;
  count: number;
}

export interface IBookRepository {
  create(data: CreateBookData): Promise<BookWithFilesAndFormats>;
  findById(id: string): Promise<BookWithFilesAndFormats | null>;
  findAll(filters: BookFilters): Promise<PaginatedBooks>;
  findByAuthorId(
    authorId: string,
    filters: BookFilters,
  ): Promise<PaginatedBooks>;
  findByFoundingAuthors(filters: BookFilters): Promise<PaginatedBooks>;
  update(id: string, data: UpdateBookData): Promise<BookWithFilesAndFormats>;
  updateStatus(id: string, status: BookStatus): Promise<void>;
  delete(id: string): Promise<void>;
  addFile(data: CreateFileData): Promise<BookFileData>;
  getFiles(bookId: string): Promise<BookFileData[]>;
  findApprovedCategoryCounts(): Promise<BookCategoryCount[]>;
}

export const BOOK_REPOSITORY_TOKEN = Symbol('IBookRepository');
