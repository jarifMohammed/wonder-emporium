import { Controller, Get, Post, Body } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricingService } from '../../application/services/pricing.service';
import { SpecificationService } from '../../application/services/specification.service';

@SkipThrottle()
@ApiTags('Print')
@Controller('print')
export class PrintController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly specificationService: SpecificationService,
  ) {}

  @Get('options')
  @ApiOperation({
    summary: 'Get Lulu print product options from the pricing spreadsheet',
  })
  getOptions() {
    return this.pricingService.getPrintOptions();
  }

  @Get('specifications')
  @ApiOperation({
    summary: 'Get print specification options from details.json',
  })
  getSpecifications() {
    return this.specificationService.getSpecificationOptions();
  }

  @Post('specifications/available')
  @ApiOperation({
    summary: 'Get valid print options after book type and page count',
  })
  getAvailableSpecifications(
    @Body()
    params: {
      format: 'PAPERBACK' | 'HARDCOVER';
      bookType: string;
      pageCount: number;
    },
  ) {
    return this.specificationService.getAvailableOptions({
      ...params,
      pageCount: Number(params.pageCount) || 0,
    });
  }

  @Post('match')
  @ApiOperation({
    summary: 'Match print specifications and return SKU with pricing',
  })
  matchSpecification(
    @Body()
    params: {
      bookType: string;
      pageCount?: number;
      interiorColor: string;
      printQuality: string;
      bind: string;
      paperType: string;
      interiorPpi?: number;
      lamination: string;
      linenColor?: string;
      foilColor?: string;
      printInsideCover?: string;
    },
  ) {
    return this.specificationService.matchSpecification(params);
  }
}
