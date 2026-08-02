import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../interfaces/auth.interface';
import { SubmitKycUseCase } from '../../application/services/submit-kyc.use-case';
import { ReviewKycUseCase } from '../../application/services/review-kyc.use-case';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SubmitKycBody {
  @ApiProperty({ example: 'W-9', description: 'Tax form type: W-9, W-8BEN, or Other' })
  @IsIn(['W-9', 'W-8BEN', 'Other'])
  taxFormType: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  taxpayerName: string;

  @ApiProperty({ example: '123-45-6789', description: 'SSN, EIN, or foreign TIN' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  taxCountry: string;
}

@ApiTags('Author KYC')
@Controller('author/kyc')
@UseGuards(AuthGuard, RolesGuard)
@Roles(userRole.AUTHOR)
@ApiBearerAuth('JWT-auth')
export class AuthorKycController {
  constructor(
    private readonly submitKycUseCase: SubmitKycUseCase,
    private readonly reviewKycUseCase: ReviewKycUseCase,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current author KYC status' })
  async getStatus(@Req() req: Request) {
    const user = (req as any).user as { id: string };
    return this.reviewKycUseCase.getKycStatus(user.id);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idFront', maxCount: 1 },
      { name: 'idBack', maxCount: 1 },
      { name: 'taxFormFile', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Submit ID documents and tax form for KYC verification',
    description: 'Upload ID front, ID back photos, optional tax form PDF, plus tax form fields. Author cannot list books until KYC is APPROVED.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idFront', 'idBack', 'taxFormType', 'taxpayerName', 'taxId', 'taxCountry'],
      properties: {
        idFront: { type: 'string', format: 'binary' },
        idBack: { type: 'string', format: 'binary' },
        taxFormFile: { type: 'string', format: 'binary' },
        taxFormType: { type: 'string', example: 'W-9' },
        taxpayerName: { type: 'string', example: 'John Doe' },
        taxId: { type: 'string', example: '123-45-6789' },
        taxCountry: { type: 'string', example: 'US' },
      },
    },
  })
  async submitKyc(
    @Req() req: Request,
    @UploadedFiles()
    files: {
      idFront?: Express.Multer.File[];
      idBack?: Express.Multer.File[];
      taxFormFile?: Express.Multer.File[];
    },
    @Body() body: SubmitKycBody,
  ) {
    const user = (req as any).user as { id: string; email: string; username: string };

    if (!files?.idFront?.[0] || !files?.idBack?.[0]) {
      return { error: 'Both idFront and idBack files are required.' };
    }

    return this.submitKycUseCase.execute(
      user.id,
      user.email,
      user.username,
      {
        idFront: files.idFront[0],
        idBack: files.idBack[0],
        taxFormFile: files.taxFormFile?.[0],
      },
      {
        taxFormType: body.taxFormType,
        taxpayerName: body.taxpayerName,
        taxId: body.taxId,
        taxCountry: body.taxCountry,
      },
    );
  }
}
