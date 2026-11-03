import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscribeToNewsletterUseCase } from '../../application/services/subscribe-to-newsletter.use-case';

export class SubscribeDto {
  @ApiProperty({
    example: 'reader@example.com',
    description: 'Subscriber email address',
  })
  @IsString({ message: 'Email must be a valid string' })
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Please provide a valid email address (e.g. name@example.com)' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly subscribeToNewsletterUseCase: SubscribeToNewsletterUseCase,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  @ApiBody({ type: SubscribeDto })
  @ApiResponse({ status: 201, description: 'Successfully subscribed' })
  async subscribe(@Body() body: SubscribeDto) {
    return this.subscribeToNewsletterUseCase.execute(body.email);
  }
}
