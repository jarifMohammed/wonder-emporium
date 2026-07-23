export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: string;
  subscribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNewsletterSubscribers {
  subscribers: NewsletterSubscriber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface INewsletterSubscriberRepository {
  create(email: string): Promise<NewsletterSubscriber>;
  findAll(filters?: { page?: number; limit?: number; status?: string }): Promise<PaginatedNewsletterSubscribers>;
  findByEmail(email: string): Promise<NewsletterSubscriber | null>;
}

export const NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN = Symbol('INewsletterSubscriberRepository');
