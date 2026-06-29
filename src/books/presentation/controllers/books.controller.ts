import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';

import { CreateBookUseCase } from '../../application/services/create-book.use-case';
import { GetBooksUseCase } from '../../application/services/get-books.use-case';
import { GetBookUseCase } from '../../application/services/get-book.use-case';
import { UpdateBookUseCase } from '../../application/services/update-book.use-case';
import { SubmitBookUseCase } from '../../application/services/submit-book.use-case';
import { ApproveBookUseCase } from '../../application/services/approve-book.use-case';
import { DeleteBookUseCase } from '../../application/services/delete-book.use-case';
import { S3FileStorageService } from '../../infrastructure/storage/s3-file-storage.service';

import {
  CreateBookRequest,
  UpdateBookRequest,
  BookQueryParams,
  ApproveBookRequest,
} from '../dto/book.request.dto';
import { BookFileType } from '../../domain/interfaces/book.interface';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(
    private readonly createBookUseCase: CreateBookUseCase,
    private readonly getBooksUseCase: GetBooksUseCase,
    private readonly getBookUseCase: GetBookUseCase,
    private readonly updateBookUseCase: UpdateBookUseCase,
    private readonly submitBookUseCase: SubmitBookUseCase,
    private readonly approveBookUseCase: ApproveBookUseCase,
    private readonly deleteBookUseCase: DeleteBookUseCase,
    private readonly s3Storage: S3FileStorageService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bookCover', maxCount: 1 },
      { name: 'audiobook', maxCount: 1 },
      { name: 'ebook', maxCount: 1 },
      { name: 'hardcover', maxCount: 1 },
      { name: 'paperback', maxCount: 1 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new book (draft or submit for review)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Book details and optional file uploads (bookCover, audiobook, ebook, hardcover, paperback)',
    type: CreateBookRequest,
  })
  @ApiResponse({ status: 201, description: 'Book created successfully' })
  async createBook(
    @Req() req: Request,
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body() body: CreateBookRequest,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const uploadedFiles = await this.s3Storage.uploadBookFiles(
      files || {},
      user.id,
    );

    const inputFiles: {
      type: BookFileType;
      url: string;
      fileKey: string;
      mimeType: string;
      size: number;
    }[] = [];

    if (uploadedFiles.bookCover) {
      inputFiles.push({ type: BookFileType.COVER, ...uploadedFiles.bookCover });
    }
    if (uploadedFiles.audiobook) {
      inputFiles.push({
        type: BookFileType.AUDIOBOOK,
        ...uploadedFiles.audiobook,
      });
    }
    if (uploadedFiles.ebook) {
      inputFiles.push({ type: BookFileType.EBOOK, ...uploadedFiles.ebook });
    }
    if (uploadedFiles.hardcover) {
      inputFiles.push({
        type: BookFileType.HARDCOVER,
        ...uploadedFiles.hardcover,
      });
    }
    if (uploadedFiles.paperback) {
      inputFiles.push({
        type: BookFileType.PAPERBACK,
        ...uploadedFiles.paperback,
      });
    }

    return this.createBookUseCase.execute({
      authorId: user.id,
      title: body.title,
      description: body.description,
      bookCover: uploadedFiles.bookCover?.url,
      isbn: body.isbn,
      category: body.category,
      tags: body.tags,
      language: body.language,
      ageGroup: body.ageGroup,
      formats: body.formats,
      authorEarnings: body.authorEarnings,
      publicationDetails: body.publicationDetails,
      files: inputFiles,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all books with filtering, search, and pagination',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiQuery({ name: 'ageGroup', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of books' })
  async getAllBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.execute(query);
  }

  @Get('approved')
  @ApiOperation({ summary: 'Get all approved/published books' })
  @ApiResponse({ status: 200, description: 'List of approved books' })
  async getApprovedBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.getApproved(query);
  }

  @Get('pending')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.MODERATOR)
  @ApiOperation({ summary: 'Get all pending (submitted) books for review' })
  @ApiResponse({ status: 200, description: 'List of pending books' })
  async getPendingBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.getPending(query);
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get books by author ID' })
  @ApiResponse({ status: 200, description: 'List of books by author' })
  async getBooksByAuthor(
    @Param('authorId') authorId: string,
    @Query() query: BookQueryParams,
  ) {
    return this.getBooksUseCase.getByAuthor(authorId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single book by ID' })
  @ApiResponse({ status: 200, description: 'Book details' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async getBook(@Param('id') id: string) {
    return this.getBookUseCase.execute(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bookCover', maxCount: 1 },
      { name: 'audiobook', maxCount: 1 },
      { name: 'ebook', maxCount: 1 },
      { name: 'hardcover', maxCount: 1 },
      { name: 'paperback', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update a book (only draft status)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Book fields to update and optional new file uploads (bookCover, audiobook, ebook, hardcover, paperback)',
    type: UpdateBookRequest,
  })
  @ApiResponse({ status: 200, description: 'Book updated successfully' })
  async updateBook(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body() body: UpdateBookRequest,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const uploadedFiles = await this.s3Storage.uploadBookFiles(
      files || {},
      user.id,
    );

    const inputFiles: {
      type: BookFileType;
      url: string;
      fileKey: string;
      mimeType: string;
      size: number;
    }[] = [];

    if (uploadedFiles.bookCover) {
      inputFiles.push({ type: BookFileType.COVER, ...uploadedFiles.bookCover });
    }
    if (uploadedFiles.audiobook) {
      inputFiles.push({
        type: BookFileType.AUDIOBOOK,
        ...uploadedFiles.audiobook,
      });
    }
    if (uploadedFiles.ebook) {
      inputFiles.push({ type: BookFileType.EBOOK, ...uploadedFiles.ebook });
    }
    if (uploadedFiles.hardcover) {
      inputFiles.push({
        type: BookFileType.HARDCOVER,
        ...uploadedFiles.hardcover,
      });
    }
    if (uploadedFiles.paperback) {
      inputFiles.push({
        type: BookFileType.PAPERBACK,
        ...uploadedFiles.paperback,
      });
    }

    return this.updateBookUseCase.execute(id, user.id, {
      title: body.title,
      description: body.description,
      bookCover: uploadedFiles.bookCover?.url,
      isbn: body.isbn,
      category: body.category,
      tags: body.tags,
      language: body.language,
      ageGroup: body.ageGroup,
      formats: body.formats,
      authorEarnings: body.authorEarnings,
      publicationDetails: body.publicationDetails,
      files: inputFiles,
    });
  }

  @Patch(':id/submit')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft book for review' })
  @ApiResponse({ status: 200, description: 'Book submitted for review' })
  async submitForReview(@Param('id') id: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.submitBookUseCase.execute(id, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a submitted book' })
  @ApiBody({ type: ApproveBookRequest })
  @ApiResponse({ status: 200, description: 'Book status updated' })
  async approveBook(@Param('id') id: string, @Body() body: ApproveBookRequest) {
    return this.approveBookUseCase.execute(id, body.status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a book' })
  @ApiResponse({ status: 200, description: 'Book deleted successfully' })
  async deleteBook(@Param('id') id: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.deleteBookUseCase.execute(id, user.id);
  }
}
