import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { GetUserLibraryUseCase } from '../../application/services/get-user-library.use-case';
import { GetLibraryAccessUseCase } from '../../application/services/get-library-access.use-case';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('Library')
@ApiBearerAuth('JWT-auth')
@Controller('library')
@UseGuards(AuthGuard, RolesGuard)
@Roles(userRole.USER, userRole.READER, userRole.AUTHOR, userRole.ADMIN)
export class LibraryController {
  constructor(
    private readonly getUserLibraryUseCase: GetUserLibraryUseCase,
    private readonly getLibraryAccessUseCase: GetLibraryAccessUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the logged-in user's purchased digital books" })
  @ApiResponse({ status: 200, description: 'Purchased ebooks and audiobooks' })
  getLibrary(@Req() req: AuthenticatedRequest) {
    return this.getUserLibraryUseCase.execute(req.user.id);
  }

  @Post(':orderItemId/access')
  @ApiOperation({ summary: 'Create a short-lived URL for a purchased file' })
  @ApiResponse({ status: 200, description: 'Five-minute signed access URL' })
  @ApiResponse({ status: 404, description: 'Purchased item or file not found' })
  getAccess(
    @Req() req: AuthenticatedRequest,
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.getLibraryAccessUseCase.execute(req.user.id, orderItemId);
  }
}
