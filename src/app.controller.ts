import { Controller, Get, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { EMAIL_SENDER_TOKEN, type IEmailSender } from './common/domain/interfaces/email-sender.interface';
import { AuthGuard } from './common/guards/auth.guard';
import { Roles } from './common/decorators/roles.decorator';
import { userRole } from './auth/interfaces/auth.interface';
import type { Request } from 'express';

class ContactDto {
  subject: string;
  message: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
  ) {}

  @ApiOperation({ summary: 'Health check endpoint' })
  @SkipThrottle() // Skip rate limiting for health check
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Liveness probe' })
  @SkipThrottle()
  @Get('health')
  health() {
    return this.appService.health();
  }

  @ApiOperation({ summary: 'Readiness probe' })
  @SkipThrottle()
  @Get('ready')
  ready() {
    return this.appService.ready();
  }

  @ApiOperation({ summary: 'Contact Us endpoint (User/Author to Admin)' })
  @ApiBody({ type: ContactDto })
  @UseGuards(AuthGuard)
  @Roles(userRole.USER, userRole.AUTHOR, userRole.READER)
  @Post('contact')
  async contactUs(@Req() req: Request, @Body() body: ContactDto) {
    const user = (req as unknown as { user: { id: string, email: string, username: string } }).user;
    await this.emailSender.sendContactUsEmail(
      user.username,
      user.email,
      body.subject,
      body.message
    );
    return { success: true, message: 'Your message has been sent to the admin.' };
  }
}
