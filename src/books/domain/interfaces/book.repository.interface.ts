import {
  BookStatus,
  BookFileType,
  BookFileData,
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
  pageCount?: number;
  trimSize?: string;
  language?: string;
  ageGroup?: string;
  listPrice?: number;
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
  pageCount?: number;
  trimSize?: string;
  language?: string;
  ageGroup?: string;
  listPrice?: number;
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

export interface BookWithFiles {
  book: Book;
  files: BookFileData[];
}

export interface PaginatedBooks {
  books: BookWithFiles[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IBookRepository {
  create(data: CreateBookData): Promise<BookWithFiles>;
  findById(id: string): Promise<BookWithFiles | null>;
  findAll(filters: BookFilters): Promise<PaginatedBooks>;
  findByAuthorId(
    authorId: string,
    filters: BookFilters,
  ): Promise<PaginatedBooks>;
  update(id: string, data: UpdateBookData): Promise<BookWithFiles>;
  updateStatus(id: string, status: BookStatus): Promise<void>;
  delete(id: string): Promise<void>;
  addFile(data: CreateFileData): Promise<BookFileData>;
  getFiles(bookId: string): Promise<BookFileData[]>;
}

export const BOOK_REPOSITORY_TOKEN = Symbol('IBookRepository');
