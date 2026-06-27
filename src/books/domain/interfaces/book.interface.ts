export enum BookStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum BookFileType {
  COVER = 'COVER',
  AUDIOBOOK = 'AUDIOBOOK',
  EBOOK = 'EBOOK',
  HARDCOVER = 'HARDCOVER',
  PAPERBACK = 'PAPERBACK',
}

export interface BookFileData {
  id: string;
  bookId: string;
  type: BookFileType;
  url: string | null;
  fileKey: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
}

export interface BookFilters {
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
