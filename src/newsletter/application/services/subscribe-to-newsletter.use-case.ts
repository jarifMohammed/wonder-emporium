import { Inject, Injectable } from '@nestjs/common';
import {
  NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN,
} from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import type { INewsletterSubscriberRepository } from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class SubscribeToNewsletterUseCase {
  constructor(
    @Inject(NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN)
    private readonly repository: INewsletterSubscriberRepository,
  ) {}

  async execute(email: string) {
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw AppError.badRequest('Email already subscribed');
    }
    return this.repository.create(email);
  }
}
