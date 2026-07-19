jest.mock(
  '../../../books/infrastructure/storage/s3-file-storage.service',
  () => ({ S3FileStorageService: class S3FileStorageService {} }),
);

import { GetLibraryAccessUseCase } from './get-library-access.use-case';
import { PrismaService } from '../../../common/services/prisma.service';
import { S3FileStorageService } from '../../../books/infrastructure/storage/s3-file-storage.service';

describe('GetLibraryAccessUseCase', () => {
  const findFirst = jest.fn();
  const createDownloadUrl = jest.fn();
  const prisma = {
    orderItem: { findFirst },
  } as unknown as PrismaService;
  const storage = {
    createDownloadUrl,
  } as unknown as S3FileStorageService;

  let useCase: GetLibraryAccessUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetLibraryAccessUseCase(prisma, storage);
  });

  it('returns a five-minute signed URL for a purchased ebook', async () => {
    findFirst.mockResolvedValue({
      id: 'order-item-1',
      book: {
        id: 'book-1',
        files: [
          {
            type: 'EBOOK',
            fileKey: 'books/author/ebook/file.epub',
            mimeType: 'application/epub+zip',
          },
        ],
      },
      format: { formatType: 'EBOOK' },
    });
    createDownloadUrl.mockResolvedValue('https://signed.example/file');

    await expect(useCase.execute('buyer-1', 'order-item-1')).resolves.toEqual({
      orderItemId: 'order-item-1',
      bookId: 'book-1',
      format: 'EBOOK',
      accessType: 'DOWNLOAD',
      url: 'https://signed.example/file',
      expiresIn: 300,
      mimeType: 'application/epub+zip',
      fileName: 'file.epub',
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'order-item-1',
          order: { buyerId: 'buyer-1', status: 'COMPLETED' },
        },
      }),
    );
    expect(createDownloadUrl).toHaveBeenCalledWith(
      'books/author/ebook/file.epub',
      300,
    );
  });

  it('does not reveal an item that is not owned by the buyer', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute('different-buyer', 'order-item-1'),
    ).rejects.toThrow('Purchased library item not found');
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });

  it('rejects physical formats', async () => {
    findFirst.mockResolvedValue({
      id: 'order-item-1',
      book: { id: 'book-1', files: [] },
      format: { formatType: 'PAPERBACK' },
    });

    await expect(useCase.execute('buyer-1', 'order-item-1')).rejects.toThrow(
      'physical format',
    );
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });
});
