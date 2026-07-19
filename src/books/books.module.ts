import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from '../auth/auth.module';
import { PrintModule } from '../print/print.module';

import { BooksController } from './presentation/controllers/books.controller';

import { CreateBookUseCase } from './application/services/create-book.use-case';
import { GetBooksUseCase } from './application/services/get-books.use-case';
import { GetBookUseCase } from './application/services/get-book.use-case';
import { UpdateBookUseCase } from './application/services/update-book.use-case';
import { SubmitBookUseCase } from './application/services/submit-book.use-case';
import { ApproveBookUseCase } from './application/services/approve-book.use-case';
import { DeleteBookUseCase } from './application/services/delete-book.use-case';

import { PrismaBookRepository } from './infrastructure/persistence/prisma-book.repository';
import { S3FileStorageService } from './infrastructure/storage/s3-file-storage.service';

import { BOOK_REPOSITORY_TOKEN } from './domain/interfaces/book.repository.interface';

@Module({
  imports: [
    AuthModule,
    PrintModule,
    BullModule.registerQueue(
      { name: 'print-validation' },
      { name: 'print-pricing' },
      { name: 'print-job-creation' },
      { name: 'print-status-sync' },
    ),
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  ],
  controllers: [BooksController],
  providers: [
    {
      provide: BOOK_REPOSITORY_TOKEN,
      useClass: PrismaBookRepository,
    },
    PrismaBookRepository,
    S3FileStorageService,
    CreateBookUseCase,
    GetBooksUseCase,
    GetBookUseCase,
    UpdateBookUseCase,
    SubmitBookUseCase,
    ApproveBookUseCase,
    DeleteBookUseCase,
  ],
  exports: [S3FileStorageService],
})
export class BooksModule {}
