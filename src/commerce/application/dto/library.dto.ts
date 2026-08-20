export type DigitalFormatType = 'EBOOK' | 'AUDIOBOOK';

export interface LibraryItemOutput {
  orderItemId: string;
  orderId: string;
  purchasedAt: Date;
  quantity: number;
  book: {
    id: string;
    title: string;
    bookCover: string | null;
    authorId: string;
    author?: {
      id: string;
      username: string | null;
      userProfile?: {
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
      } | null;
    } | null;
  };
  format: {
    id: string;
    type: DigitalFormatType;
  };
  accessType: 'DOWNLOAD' | 'STREAM';
}

export interface LibraryAccessOutput {
  orderItemId: string;
  bookId: string;
  format: DigitalFormatType;
  accessType: 'DOWNLOAD' | 'STREAM';
  url: string;
  expiresIn: number;
  mimeType: string | null;
  fileName: string;
}
