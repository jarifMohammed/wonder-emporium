import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import {
  EMAIL_SENDER_TOKEN,
  type IEmailSender,
} from './common/domain/interfaces/email-sender.interface';
import type { Request } from 'express';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AccessTokenAuthenticator } from './auth/application/services/access-token-authenticator.service';
import AppError from './common/errors/app.error';

class ContactDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
    private readonly authenticator: AccessTokenAuthenticator,
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

  @ApiOperation({ summary: 'Contact / Support endpoint (User/Author/Guest to Admin)' })
  @ApiBody({ type: ContactDto })
  @Post('contact')
  async contactUs(@Req() req: Request, @Body() body: ContactDto) {
    let senderName = body.name || 'Valued Customer';
    let senderEmail = body.email;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const principal = await this.authenticator.authenticate(token);
        if (principal) {
          senderName = body.name || principal.email;
          senderEmail = body.email || principal.email;
        }
      } catch {
        // Fall back to provided body credentials
      }
    }

    if (!senderEmail) {
      throw AppError.badRequest('Email address is required to submit a support inquiry.');
    }

    await this.emailSender.sendContactUsEmail(
      senderName,
      senderEmail,
      body.subject,
      body.message,
    );

    return {
      success: true,
      message: 'Your message has been sent to our support team.',
    };
  }
}
