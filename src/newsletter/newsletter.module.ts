import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/modules/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../common/modules/queue.module';
import { NewsletterController } from './presentation/controllers/newsletter.controller';
import { AdminNewsletterController } from './presentation/controllers/admin-newsletter.controller';
import { SubscribeToNewsletterUseCase } from './application/services/subscribe-to-newsletter.use-case';
import { GetNewsletterSubscribersUseCase } from './application/services/get-newsletter-subscribers.use-case';
import { PrismaNewsletterSubscriberRepository } from './infrastructure/persistence/prisma-newsletter-subscriber.repository';
import { NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN } from './domain/interfaces/newsletter-subscriber.repository.interface';

@Module({
  imports: [PrismaModule, AuthModule, QueueModule],
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [
    {
      provide: NEWSLETTER_SUBSCRIBER_REPOSITORY_TOKEN,
      useClass: PrismaNewsletterSubscriberRepository,
    },
    SubscribeToNewsletterUseCase,
    GetNewsletterSubscribersUseCase,
    PrismaNewsletterSubscriberRepository,
  ],
})
export class NewsletterModule {}
