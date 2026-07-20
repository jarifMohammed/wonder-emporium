import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BookStatus } from '../../domain/interfaces/book.interface';

export class BookFormatDto {
  @ApiProperty({ example: 'EBOOK' })
  @IsString()
  @IsNotEmpty()
  formatType: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  listPrice: number;

  @ApiPropertyOptional({ example: 'SKU-123' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 320 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pageCount?: number;

  @ApiPropertyOptional({ example: '6x9' })
  @IsString()
  @IsOptional()
  trimSize?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsString()
  @IsOptional()
  interiorUrl?: string;
}

export class PrintEditionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: '6x9' })
  @IsString()
  @IsNotEmpty()
  trimSize: string;

  @ApiProperty({ example: 'Perfect' })
  @IsString()
  @IsNotEmpty()
  bindingType: string;

  @ApiProperty({ example: 'Black & White' })
  @IsString()
  @IsNotEmpty()
  interiorColor: string;

  @ApiProperty({ example: '60# Uncoated White' })
  @IsString()
  @IsNotEmpty()
  paperType: string;

  @ApiProperty({ example: 'Pocketbook' })
  @IsString()
  @IsNotEmpty()
  bookType: string;

  @ApiProperty({ example: 'Standard' })
  @IsString()
  @IsOptional()
  printQuality?: string;

  @ApiProperty({ example: 'Gloss' })
  @IsString()
  @IsNotEmpty()
  coverFinish: string;

  @ApiPropertyOptional({ example: 4.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  authorProfit?: number;

  @ApiPropertyOptional({ example: 9.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;
}

export class CreateBookRequest {
  @ApiProperty({ example: 'The Great Adventure' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: 'A thrilling adventure story...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '978-3-16-148410-0' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ example: 'Fiction' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: ['adventure', 'fiction', 'thriller'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch {
        return value.split(',').map((t: string) => t.trim());
      }
    }
    return value as string[];
  })
  tags?: string[];

  @ApiPropertyOptional({ example: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'Adult' })
  @IsString()
  @IsOptional()
  ageGroup?: string;

  @ApiPropertyOptional({ type: [BookFormatDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookFormatDto)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as BookFormatDto[];
    } catch {
      return value;
    }
  })
  formats?: BookFormatDto[];

  @ApiPropertyOptional({ example: 7.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  authorEarnings?: number;

  @ApiPropertyOptional({ example: 'Published by Wonder Press, 2024' })
  @IsString()
  @IsOptional()
  publicationDetails?: string;

  @ApiPropertyOptional({ type: PrintEditionDto })
  @ValidateNested()
  @Type(() => PrintEditionDto)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as PrintEditionDto;
    } catch {
      return value;
    }
  })
  printEdition?: PrintEditionDto;
}

export class UpdateBookRequest {
  @ApiPropertyOptional({ example: 'The Great Adventure' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({ example: 'A thrilling adventure story...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '978-3-16-148410-0' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ example: 'Fiction' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: ['adventure', 'fiction'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch {
        return value.split(',').map((t: string) => t.trim());
      }
    }
    return value as string[];
  })
  tags?: string[];

  @ApiPropertyOptional({ example: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'Adult' })
  @IsString()
  @IsOptional()
  ageGroup?: string;

  @ApiPropertyOptional({ type: [BookFormatDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookFormatDto)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as BookFormatDto[];
    } catch {
      return value;
    }
  })
  formats?: BookFormatDto[];

  @ApiPropertyOptional({ example: 7.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  authorEarnings?: number;

  @ApiPropertyOptional({ example: 'Published by Wonder Press, 2024' })
  @IsString()
  @IsOptional()
  publicationDetails?: string;

  @ApiPropertyOptional({ type: PrintEditionDto })
  @ValidateNested()
  @Type(() => PrintEditionDto)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as PrintEditionDto;
    } catch {
      return value;
    }
  })
  printEdition?: PrintEditionDto;
}

export class BookQueryParams {
  @ApiPropertyOptional({ enum: BookStatus })
  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class ApproveBookRequest {
  @ApiProperty({ enum: BookStatus, example: BookStatus.APPROVED })
  @IsEnum(BookStatus)
  @IsNotEmpty()
  status: BookStatus.APPROVED | BookStatus.REJECTED;
}
