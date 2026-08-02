import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../interfaces/auth.interface';
import { ReviewKycUseCase } from '../../application/services/review-kyc.use-case';

class ReviewKycBody {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiProperty({ required: false, example: 'ID image is blurry, please resubmit.' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

@ApiTags('Admin KYC')
@Controller('admin/kyc')
@UseGuards(AuthGuard, RolesGuard)
@Roles(userRole.ADMIN, userRole.SUPERADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminKycController {
  constructor(private readonly reviewKycUseCase: ReviewKycUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List all submitted/reviewed KYC records' })
  @ApiResponse({ status: 200, description: 'List of KYC submissions' })
  listAll() {
    return this.reviewKycUseCase.listAll();
  }

  @Get(':authorId')
  @ApiOperation({ summary: 'Get KYC status for a specific author' })
  @ApiResponse({ status: 200, description: 'KYC record' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  getStatus(@Param('authorId') authorId: string) {
    return this.reviewKycUseCase.getKycStatus(authorId);
  }

  @Patch(':authorId/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject an author KYC submission' })
  @ApiBody({ type: ReviewKycBody })
  @ApiResponse({ status: 200, description: 'KYC reviewed' })
  async review(
    @Param('authorId') authorId: string,
    @Body() body: ReviewKycBody,
    @Req() req: Request,
  ) {
    const admin = (req as any).user as { id: string };
    return this.reviewKycUseCase.execute(authorId, admin.id, body.decision, body.adminNote);
  }
}
