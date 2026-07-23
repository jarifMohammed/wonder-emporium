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
import { SkipThrottle } from '@nestjs/throttler';
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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { OptionalAuthGuard } from '../../../common/guards/optional-auth.guard';
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
import { LuluApiService } from '../../../print/infrastructure/lulu/lulu-api.service';
import {
  LuluValidationResponse,
  LuluValidationStatus,
} from '../../../print/domain/interfaces/lulu.types';

import {
  CreateBookRequest,
  UpdateBookRequest,
  BookQueryParams,
  ApproveBookRequest,
} from '../dto/book.request.dto';
import {
  BookFileType,
  BookStatus,
} from '../../domain/interfaces/book.interface';

@SkipThrottle()
@ApiTags('Books', 'Author', 'Admin')
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
    private readonly luluApi: LuluApiService,
  ) {}

  @Post('validate-print-files')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'interiorPdf', maxCount: 1 },
      { name: 'coverPdf', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Upload and validate print-ready interior and cover PDFs',
  })
  @ApiConsumes('multipart/form-data')
  async validatePrintFiles(
    @Req() req: Request,
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body()
    body: {
      podPackageId: string;
      pageCount?: string;
    },
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const interiorFile = files?.interiorPdf?.[0];
    const coverFile = files?.coverPdf?.[0];

    if (!interiorFile || !coverFile) {
      return {
        valid: false,
        message: 'Interior PDF and Cover PDF are required.',
      };
    }
    if (!body.podPackageId) {
      return {
        valid: false,
        message: 'POD package ID is required before validation.',
      };
    }

    const uploaded = await this.s3Storage.uploadBookFiles(
      { interiorPdf: [interiorFile], coverPdf: [coverFile] },
      user.id,
    );
    const interiorUrl = uploaded.interiorPdf!.url;
    const coverUrl = uploaded.coverPdf!.url;

    const interiorStart =
      await this.luluApi.createInteriorValidation(interiorUrl);
    const interior = await this.pollLuluValidation(
      () => this.luluApi.getInteriorValidation(interiorStart.id),
      ['VALIDATED'],
      ['ERROR'],
    );
    const interiorPageCount =
      Number(interior.page_count) || Number(body.pageCount) || 0;
    const validPodPackageIds = interior.valid_pod_package_ids || [];
    const podPackageAllowed =
      !validPodPackageIds.length ||
      validPodPackageIds.includes(body.podPackageId);

    if (!podPackageAllowed) {
      return {
        valid: false,
        message: 'Selected POD package is not valid for this interior PDF.',
        interior,
        validPodPackageIds,
      };
    }

    const coverDimensions = await this.luluApi.calculateCoverDimensions({
      pod_package_id: body.podPackageId,
      interior_page_count: interiorPageCount,
    });
    const coverStart = await this.luluApi.createCoverValidation({
      source_url: coverUrl,
      pod_package_id: body.podPackageId,
      interior_page_count: interiorPageCount,
    });
    const cover = await this.pollLuluValidation(
      () => this.luluApi.getCoverValidation(coverStart.id),
      ['NORMALIZED'],
      ['ERROR'],
    );

    return {
      valid: true,
      podPackageId: body.podPackageId,
      interiorPageCount,
      interior,
      cover,
      coverDimensions,
      files: {
        interiorPdf: uploaded.interiorPdf,
        coverPdf: uploaded.coverPdf,
      },
    };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bookCover', maxCount: 1 },
      { name: 'audiobook', maxCount: 1 },
      { name: 'ebook', maxCount: 1 },
      { name: 'hardcover', maxCount: 1 },
      { name: 'paperback', maxCount: 1 },
      { name: 'interiorPdf', maxCount: 1 },
      { name: 'coverPdf', maxCount: 1 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new book (draft or submit for review)',
    description:
      'Used by Authors to create a new book. Books start in a draft state unless submitted for review. Supports multipart/form-data for uploading cover images, audiobooks, PDFs, etc.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Book details and optional file uploads (bookCover, audiobook, ebook, hardcover, paperback, interiorPdf, coverPdf)',
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
    if (uploadedFiles.interiorPdf) {
      inputFiles.push({
        type: BookFileType.INTERIOR_PDF,
        ...uploadedFiles.interiorPdf,
      });
    }
    if (uploadedFiles.coverPdf) {
      inputFiles.push({
        type: BookFileType.COVER_PDF,
        ...uploadedFiles.coverPdf,
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
      printEdition: body.printEdition,
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
    return this.getBooksUseCase.getApproved(query);
  }

  @Get('approved')
  @ApiOperation({ summary: 'Get all approved/published books' })
  @ApiResponse({ status: 200, description: 'List of approved books' })
  async getApprovedBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.getApproved(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get distinct categories from approved books' })
  @ApiResponse({
    status: 200,
    description: 'List of book categories with counts',
  })
  async getBookCategories() {
    return this.getBooksUseCase.getApprovedCategories();
  }

  @Get('founding-authors')
  @ApiOperation({ summary: 'Get books by founding authors' })
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
  @ApiResponse({ status: 200, description: 'List of books by founding authors' })
  async getFoundingAuthorBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.getByFoundingAuthors(query);
  }

  @Get('pending')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN, userRole.MODERATOR)
  @ApiOperation({ summary: 'Get all pending (submitted) books for review' })
  @ApiResponse({ status: 200, description: 'List of pending books' })
  async getPendingBooks(@Query() query: BookQueryParams) {
    return this.getBooksUseCase.getPending(query);
  }

  @Get('mine')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get all books owned by the current author' })
  @ApiResponse({ status: 200, description: 'Paginated author book list' })
  async getMyBooks(@Req() req: Request, @Query() query: BookQueryParams) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.getBooksUseCase.getByAuthor(user.id, query);
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get books by author ID' })
  @ApiResponse({ status: 200, description: 'List of books by author' })
  async getBooksByAuthor(
    @Param('authorId') authorId: string,
    @Query() query: BookQueryParams,
  ) {
    return this.getBooksUseCase.getByAuthor(authorId, {
      ...query,
      status: BookStatus.APPROVED,
    });
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get a single book by ID' })
  @ApiResponse({ status: 200, description: 'Book details' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async getBook(@Param('id') id: string, @Req() req: Request) {
    const user = (req as unknown as { user?: { id: string; role: userRole } })
      .user;
    return this.getBookUseCase.execute(id, user);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bookCover', maxCount: 1 },
      { name: 'audiobook', maxCount: 1 },
      { name: 'ebook', maxCount: 1 },
      { name: 'hardcover', maxCount: 1 },
      { name: 'paperback', maxCount: 1 },
      { name: 'interiorPdf', maxCount: 1 },
      { name: 'coverPdf', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update a draft or rejected book' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Book fields to update and optional new file uploads (bookCover, audiobook, ebook, hardcover, paperback, interiorPdf, coverPdf)',
    type: UpdateBookRequest,
  })
  @ApiResponse({ status: 200, description: 'Book updated successfully' })
  async updateBook(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body() body: UpdateBookRequest,
  ) {
    const user = (req as unknown as { user: { id: string; role: userRole } })
      .user;
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
    if (uploadedFiles.interiorPdf) {
      inputFiles.push({
        type: BookFileType.INTERIOR_PDF,
        ...uploadedFiles.interiorPdf,
      });
    }
    if (uploadedFiles.coverPdf) {
      inputFiles.push({
        type: BookFileType.COVER_PDF,
        ...uploadedFiles.coverPdf,
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
      printEdition: body.printEdition,
      isAdmin:
        user.role === userRole.ADMIN || user.role === userRole.SUPERADMIN,
    });
  }

  @Patch(':id/submit')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft book for review' })
  @ApiResponse({ status: 200, description: 'Book submitted for review' })
  async submitForReview(@Param('id') id: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.submitBookUseCase.execute(id, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN, userRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a submitted book' })
  @ApiBody({ type: ApproveBookRequest })
  @ApiResponse({ status: 200, description: 'Book status updated' })
  async approveBook(@Param('id') id: string, @Body() body: ApproveBookRequest) {
    return this.approveBookUseCase.execute(id, body.status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN, userRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a book' })
  @ApiResponse({ status: 200, description: 'Book deleted successfully' })
  async deleteBook(@Param('id') id: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string; role: userRole } })
      .user;
    return this.deleteBookUseCase.execute(
      id,
      user.id,
      user.role === userRole.ADMIN || user.role === userRole.SUPERADMIN,
    );
  }

  private async pollLuluValidation(
    fetchStatus: () => Promise<LuluValidationResponse>,
    successStatuses: LuluValidationStatus[],
    failureStatuses: LuluValidationStatus[],
  ): Promise<LuluValidationResponse> {
    let latest = await fetchStatus();
    for (let attempt = 0; attempt < 20; attempt++) {
      if (successStatuses.includes(latest.status)) return latest;
      if (failureStatuses.includes(latest.status)) {
        throw new Error(
          `Lulu validation failed with status ${latest.status}: ${JSON.stringify(latest.errors || [])}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      latest = await fetchStatus();
    }
    throw new Error(`Lulu validation timed out with status ${latest.status}`);
  }
}
