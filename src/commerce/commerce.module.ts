import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

import { CommerceController } from './presentation/controllers/commerce.controller';
import { StripeWebhookController } from './presentation/controllers/stripe-webhook.controller';
import { OrdersController } from './presentation/controllers/orders.controller';
import { PayoutsController } from './presentation/controllers/payouts.controller';
import { StatisticsController } from './presentation/controllers/statistics.controller';
import { LibraryController } from './presentation/controllers/library.controller';

import { CreateCheckoutSessionUseCase } from './application/services/create-checkout-session.use-case';
import { HandleCheckoutCompletedUseCase } from './application/services/handle-checkout-completed.use-case';
import { OnboardAuthorUseCase } from './application/services/onboard-author.use-case';
import { OutboxProcessorService } from './application/services/outbox-processor.service';
import { SyncConnectAccountUseCase } from './application/services/sync-connect-account.use-case';
import { UserGetOrderHistoryUseCase } from './application/services/user-get-order-history.use-case';
import { AuthorGetPayoutsUseCase } from './application/services/author-get-payouts.use-case';
import { AuthorRequestPayoutUseCase } from './application/services/author-request-payout.use-case';
import { AdminGetPayoutsUseCase } from './application/services/admin-get-payouts.use-case';
import { AdminApprovePayoutUseCase } from './application/services/admin-approve-payout.use-case';
import { AdminGetStatisticsUseCase } from './application/services/admin-get-statistics.use-case';
import { AuthorGetStatisticsUseCase } from './application/services/author-get-statistics.use-case';
import { GetUserLibraryUseCase } from './application/services/get-user-library.use-case';
import { GetLibraryAccessUseCase } from './application/services/get-library-access.use-case';

import { StripeService } from './infrastructure/stripe/stripe.service';
import { PrismaCommerceRepository } from './infrastructure/persistence/prisma-commerce.repository';
import { PrismaOrderRepository } from './infrastructure/persistence/prisma-order.repository';
import { PrismaOutboxRepository } from './infrastructure/persistence/prisma-outbox.repository';

import { COMMERCE_REPOSITORY_TOKEN } from './domain/interfaces/commerce.repository.interface';
import { ORDER_REPOSITORY_TOKEN } from './domain/interfaces/order.repository.interface';
import { OUTBOX_REPOSITORY_TOKEN } from './domain/interfaces/outbox.repository.interface';

import { OutboxProcessor } from './application/queues/outbox.processor';
import { ProcessOutboxEventsCron } from './application/cron/process-outbox.cron';

import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../common/modules/queue.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    QueueModule,
    BooksModule,
    BullModule.registerQueue(
      { name: 'commerce-outbox' },
      { name: 'print-job-creation' },
    ),
  ],
  controllers: [
    CommerceController,
    StripeWebhookController,
    OrdersController,
    PayoutsController,
    StatisticsController,
    LibraryController,
  ],
  providers: [
    {
      provide: COMMERCE_REPOSITORY_TOKEN,
      useClass: PrismaCommerceRepository,
    },
    {
      provide: ORDER_REPOSITORY_TOKEN,
      useClass: PrismaOrderRepository,
    },
    {
      provide: OUTBOX_REPOSITORY_TOKEN,
      useClass: PrismaOutboxRepository,
    },
    StripeService,
    CreateCheckoutSessionUseCase,
    HandleCheckoutCompletedUseCase,
    OnboardAuthorUseCase,
    SyncConnectAccountUseCase,
    OutboxProcessorService,
    OutboxProcessor,
    ProcessOutboxEventsCron,
    UserGetOrderHistoryUseCase,
    AuthorGetPayoutsUseCase,
    AuthorRequestPayoutUseCase,
    AdminGetPayoutsUseCase,
    AdminApprovePayoutUseCase,
    AdminGetStatisticsUseCase,
    AuthorGetStatisticsUseCase,
    GetUserLibraryUseCase,
    GetLibraryAccessUseCase,
  ],
  exports: [CreateCheckoutSessionUseCase],
})
export class CommerceModule {}
