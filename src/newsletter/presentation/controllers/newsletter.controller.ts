import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SubscribeToNewsletterUseCase } from '../../application/services/subscribe-to-newsletter.use-case';

class SubscribeDto {
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
