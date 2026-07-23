import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  INewsletterSubscriberRepository,
  NewsletterSubscriber,
  PaginatedNewsletterSubscribers,
} from '../../domain/interfaces/newsletter-subscriber.repository.interface';

@Injectable()
export class PrismaNewsletterSubscriberRepository implements INewsletterSubscriberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string): Promise<NewsletterSubscriber> {
    const subscriber = await this.prisma.newsletterSubscriber.create({
      data: { email },
    });
    return this.toDomain(subscriber);
  }

  async findAll(filters?: { page?: number; limit?: number; status?: string }): Promise<PaginatedNewsletterSubscribers> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const where = filters?.status ? { status: filters.status } : {};

    const [subscribers, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return {
      subscribers: subscribers.map(this.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    return subscriber ? this.toDomain(subscriber) : null;
  }

  private toDomain(subscriber: any): NewsletterSubscriber {
    return {
      id: subscriber.id,
      email: subscriber.email,
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt,
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
    };
  }
}
