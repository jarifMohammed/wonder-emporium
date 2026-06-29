import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { AdminGetStatisticsUseCase } from '../../application/services/admin-get-statistics.use-case';
import { AuthorGetStatisticsUseCase } from '../../application/services/author-get-statistics.use-case';
import type { Request } from 'express';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly adminGetStatisticsUseCase: AdminGetStatisticsUseCase,
    private readonly authorGetStatisticsUseCase: AuthorGetStatisticsUseCase,
  ) {}

  @Get('admin')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get platform-wide statistics for admins' })
  async getAdminStatistics() {
    return this.adminGetStatisticsUseCase.execute();
  }

  @Get('author')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR)
  @ApiOperation({ summary: 'Get statistics for the logged-in author' })
  async getAuthorStatistics(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.authorGetStatisticsUseCase.execute(user.id);
  }
}
