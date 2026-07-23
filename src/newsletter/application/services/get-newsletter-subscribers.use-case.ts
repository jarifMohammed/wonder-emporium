import { Inject, Injectable } from '@nestjs/common';
import {
  NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN,
} from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import type { INewsletterSubscriberRepository } from '../../domain/interfaces/newsletter-subscriber.repository.interface';

@Injectable()
export class GetNewsletterSubscribersUseCase {
  constructor(
    @Inject(NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN)
    private readonly repository: INewsletterSubscriberRepository,
  ) {}

  async execute(filters?: { page?: number; limit?: number; status?: string }) {
    return this.repository.findAll(filters);
  }
}
