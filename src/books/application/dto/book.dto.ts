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
  language: string | null;
  ageGroup: string | null;
  formats: {
    id: string;
    bookId: string;
    formatType: string;
    listPrice: number;
    sku: string | null;
    pageCount: number | null;
    trimSize: string | null;
    coverUrl: string | null;
    interiorUrl: string | null;
  }[];
  authorEarnings: number | null;
  publicationDetails: string | null;
  status: BookStatus;
  files: BookFileData[];
  createdAt: Date;
  updatedAt: Date;
  printEdition?: any;
  sellingPrice?: number;
  printAvailable?: boolean;
  ebookAvailable?: boolean;
  audiobookAvailable?: boolean;
  author?: {
    id: string;
    username: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
      bio: string | null;
      avatarUrl: string | null;
    } | null;
    isFoundingAuthor: boolean;
  };
}

export interface PaginatedBooksOutput {
  books: BookOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookCategoryOutput {
  name: string;
  count: number;
}

export interface BookCategoriesOutput {
  categories: BookCategoryOutput[];
  total: number;
}

export interface CreateBookInput {
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
  files?: {
    type: BookFileType;
    url: string;
    fileKey: string;
    mimeType: string;
    size: number;
  }[];
  printEdition?: {
    enabled: boolean;
    interiorPdfUrl?: string;
    coverPdfUrl?: string;
    pageCount?: number;
    trimSize: string;
    bindingType: string;
    interiorColor: string;
    paperType: string;
    interiorPpi?: number;
    coverFinish: string;
    bookType: string;
    printQuality?: string;
    linenColor?: string;
    foilColor?: string;
    printInsideCover?: string;
    podPackageId?: string;
    authorProfit?: number;
    sellingPrice?: number;
  };
}

export interface UpdateBookInput {
  isAdmin?: boolean;
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
  files?: {
    type: BookFileType;
    url: string;
    fileKey: string;
    mimeType: string;
    size: number;
  }[];
  printEdition?: {
    enabled: boolean;
    interiorPdfUrl?: string;
    coverPdfUrl?: string;
    pageCount?: number;
    trimSize: string;
    bindingType: string;
    interiorColor: string;
    paperType: string;
    interiorPpi?: number;
    coverFinish: string;
    bookType: string;
    printQuality?: string;
    linenColor?: string;
    foilColor?: string;
    printInsideCover?: string;
    podPackageId?: string;
    authorProfit?: number;
    sellingPrice?: number;
  };
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
