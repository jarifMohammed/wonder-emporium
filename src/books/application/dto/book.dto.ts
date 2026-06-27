import {
  BookStatus,
  BookFileType,
  BookFileData,
} from '../../domain/interfaces/book.interface';

export interface BookOutput {
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
  status: BookStatus;
  files: BookFileData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedBooksOutput {
  books: BookOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBookInput {
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
  files?: {
    type: BookFileType;
    url: string;
    fileKey: string;
    mimeType: string;
    size: number;
  }[];
}

export interface UpdateBookInput {
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
  files?: {
    type: BookFileType;
    url: string;
    fileKey: string;
    mimeType: string;
    size: number;
  }[];
}

export interface BookFiltersInput {
  status?: BookStatus;
  authorId?: string;
  search?: string;
  category?: string;
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
