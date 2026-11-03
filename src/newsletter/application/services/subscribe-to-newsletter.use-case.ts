import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN,
} from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import type { INewsletterSubscriberRepository } from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import { EMAIL_SENDER_TOKEN } from '../../../common/domain/interfaces/email-sender.interface';
import type { IEmailSender } from '../../../common/domain/interfaces/email-sender.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class SubscribeToNewsletterUseCase {
  private readonly logger = new Logger(SubscribeToNewsletterUseCase.name);

  constructor(
    @Inject(NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN)
    private readonly repository: INewsletterSubscriberRepository,
    @Inject(EMAIL_SENDER_TOKEN)
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw AppError.badRequest('Email address is required.');
    }

    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing) {
      throw AppError.badRequest('This email is already subscribed to our newsletter.');
    }

    const subscriber = await this.repository.create(normalizedEmail);

    // Send confirmation welcome email asynchronously
    try {
      await this.emailSender.sendNewsletterWelcomeEmail(normalizedEmail);
    } catch (error) {
      this.logger.error(
        `Failed to queue welcome email for subscriber ${normalizedEmail}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return subscriber;
  }
}
