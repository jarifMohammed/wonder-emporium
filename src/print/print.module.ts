import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LuluAuthService } from './application/services/lulu-auth.service';
import { PricingService } from './application/services/pricing.service';
import { PdfUtilsService } from './application/services/pdf-utils.service';
import { LuluApiService } from './infrastructure/lulu/lulu-api.service';
import { PrismaPrintRepository } from './infrastructure/persistence/prisma-print.repository';
import { ValidationProcessor } from './application/queues/validation.processor';
import { PricingProcessor } from './application/queues/pricing.processor';
import { PrintJobProcessor } from './application/queues/print-job.processor';
import { StatusSyncProcessor } from './application/queues/status-sync.processor';
import { PRINT_REPOSITORY_TOKEN } from './domain/interfaces/print.repository.interface';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'print-validation' },
      { name: 'print-pricing' },
      { name: 'print-job-creation' },
      { name: 'print-status-sync' },
    ),
  ],
  providers: [
    LuluAuthService,
    PricingService,
    PdfUtilsService,
    LuluApiService,
    {
      provide: PRINT_REPOSITORY_TOKEN,
      useClass: PrismaPrintRepository,
    },
    PrismaPrintRepository,
    ValidationProcessor,
    PricingProcessor,
    PrintJobProcessor,
    StatusSyncProcessor,
  ],
  exports: [
    LuluAuthService,
    PricingService,
    PdfUtilsService,
    LuluApiService,
    PrismaPrintRepository,
    PRINT_REPOSITORY_TOKEN,
  ],
})
export class PrintModule {}
