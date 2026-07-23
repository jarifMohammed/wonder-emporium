import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetFoundingAuthorsUseCase } from '../../application/services/get-founding-authors.use-case';

@ApiTags('Authors')
@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly getFoundingAuthorsUseCase: GetFoundingAuthorsUseCase,
  ) {}

  @Get('founding')
  @ApiOperation({ summary: 'Get all founding authors' })
  @ApiResponse({ status: 200, description: 'List of founding authors' })
  async getFoundingAuthors(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getFoundingAuthorsUseCase.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('founding/:id')
  @ApiOperation({ summary: 'Get a single founding author by ID' })
  @ApiResponse({ status: 200, description: 'Founding author details' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async getFoundingAuthor(@Param('id') id: string) {
    return this.getFoundingAuthorsUseCase.getById(id);
  }
}
