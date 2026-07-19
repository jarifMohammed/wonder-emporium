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
