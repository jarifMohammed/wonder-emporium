import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { GetNewsletterSubscribersUseCase } from '../../application/services/get-newsletter-subscribers.use-case';

@ApiTags('Admin Newsletter')
@Controller('admin/newsletter')
@UseGuards(AuthGuard, RolesGuard)
@Roles(userRole.ADMIN, userRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminNewsletterController {
  constructor(
    private readonly getNewsletterSubscribersUseCase: GetNewsletterSubscribersUseCase,
  ) {}

  @Get('subscribers')
  @ApiOperation({ summary: 'Get all newsletter subscribers' })
  @ApiResponse({ status: 200, description: 'List of subscribers' })
  async getSubscribers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.getNewsletterSubscribersUseCase.execute({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }
}
