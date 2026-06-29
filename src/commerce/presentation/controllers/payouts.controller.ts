import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { AuthorGetPayoutsUseCase } from '../../application/services/author-get-payouts.use-case';
import { AuthorRequestPayoutUseCase } from '../../application/services/author-request-payout.use-case';
import { AdminGetPayoutsUseCase } from '../../application/services/admin-get-payouts.use-case';
import { AdminApprovePayoutUseCase } from '../../application/services/admin-approve-payout.use-case';
import type { Request } from 'express';

@ApiTags('Payouts')
@Controller('payouts')
export class PayoutsController {
  constructor(
    private readonly authorGetPayoutsUseCase: AuthorGetPayoutsUseCase,
    private readonly authorRequestPayoutUseCase: AuthorRequestPayoutUseCase,
    private readonly adminGetPayoutsUseCase: AdminGetPayoutsUseCase,
    private readonly adminApprovePayoutUseCase: AdminApprovePayoutUseCase,
  ) {}

  // ─── AUTHOR ENDPOINTS ────────────────────────────────────────────────────────

  @Get('author')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR)
  @ApiOperation({ summary: 'Get all payouts (orders) for the logged-in author' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAuthorPayouts(@Req() req: Request, @Query('status') status?: string) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.authorGetPayoutsUseCase.execute(user.id, status);
  }

  @Post('author/:id/request')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR)
  @ApiOperation({ summary: 'Request a payout for a specific order' })
  async requestPayout(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.authorRequestPayoutUseCase.execute(user.id, id);
  }

  // ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

  @Get('admin')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get all platform payouts' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAdminPayouts(@Query('status') status?: string) {
    return this.adminGetPayoutsUseCase.execute(status);
  }

  @Post('admin/:id/approve')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a requested payout and trigger Stripe Transfer' })
  async approvePayout(@Param('id') id: string) {
    return this.adminApprovePayoutUseCase.execute(id);
  }
}
