import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../interfaces/auth.interface';
import { UpdateUserStatusUseCase } from '../../application/services/update-user-status.use-case';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(userRole.ADMIN, userRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminUsersController {
  constructor(private readonly updateUserStatusUseCase: UpdateUserStatusUseCase) {}

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a user (set status to ACTIVE)' })
  @ApiResponse({ status: 200, description: 'User approved successfully' })
  async approveUser(@Param('id') id: string) {
    await this.updateUserStatusUseCase.execute(id, 'ACTIVE');
    return { message: 'User approved successfully' };
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user (set status to SUSPENDED)' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(@Param('id') id: string) {
    await this.updateUserStatusUseCase.execute(id, 'SUSPENDED');
    return { message: 'User suspended successfully' };
  }
}
