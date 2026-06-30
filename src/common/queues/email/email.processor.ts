import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJob } from './email.queue';
import { EmailService } from 'src/common/services/email.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly emailService: EmailService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    this.logger.info(`Processing email job: ${job.name} (ID: ${job.id})`, {
      context: 'EmailProcessor',
      jobId: job.id,
      jobName: job.name,
    });

    try {
      switch (job.data.type) {
        case 'verification':
          await this.handleVerificationEmail(job);
          break;
        case 'welcome':
          await this.handleWelcomeEmail(job);
          break;
        case 'order-receipt':
          await this.handleOrderReceiptEmail(job);
          break;
        case 'author-sale':
          await this.handleAuthorSaleEmail(job);
          break;
        case 'author-onboarding-approved':
          await this.handleAuthorOnboardingApprovedEmail(job);
          break;
        case 'contact-us':
          await this.handleContactUsEmail(job);
          break;
        default:
          this.logger.warn(
            `Unknown email job type: ${String((job.data as { type?: string }).type || 'undefined')}`,
            { context: 'EmailProcessor', jobId: job.id },
          );
      }
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry
    }
  }

  private async handleVerificationEmail(job: Job<EmailJob>): Promise<void> {
    const data = job.data as Extract<EmailJob, { type: 'verification' }>;
    const { email, username, verificationCode, authId } = data;

    try {
      // Send the email
      await this.emailService.sendVerificationEmail(
        email,
        username,
        verificationCode,
      );

      // Update email history status to 'sent'
      await this.prismaService.emailHistory.updateMany({
        where: {
          authId,
          emailType: 'verification',
          emailStatus: 'pending',
        },
        data: {
          emailStatus: 'sent',
        },
      });

      this.logger.info(`Verification email sent successfully to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Update email history status to 'failed'
      await this.prismaService.emailHistory.updateMany({
        where: {
          authId,
          emailType: 'verification',
          emailStatus: 'pending',
        },
        data: {
          emailStatus: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Failed to send email',
        },
      });

      throw error; // Re-throw to trigger retry
    }
  }

  private async handleWelcomeEmail(job: Job<EmailJob>): Promise<void> {
    const data = job.data as Extract<EmailJob, { type: 'welcome' }>;
    const { email, username } = data;

    try {
      await this.emailService.sendWelcomeEmail(email, username);
      this.logger.info(`Welcome email sent successfully to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw for welcome emails - they're non-critical
      // Just log the error and mark job as complete
    }
  }

  private async handleOrderReceiptEmail(job: Job<EmailJob>): Promise<void> {
    const jobData = job.data as Extract<EmailJob, { type: 'order-receipt' }>;
    const { email, data } = jobData;

    try {
      await this.emailService.sendOrderReceiptEmail(email, data);
      this.logger.info(`Order receipt email sent successfully to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
        orderId: data.orderId,
      });
    } catch (error) {
      this.logger.error(`Failed to send order receipt email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Re-throw to trigger retry — receipts are important
    }
  }

  private async handleAuthorSaleEmail(job: Job<EmailJob>): Promise<void> {
    const jobData = job.data as Extract<EmailJob, { type: 'author-sale' }>;
    const { email, data } = jobData;

    try {
      await this.emailService.sendAuthorSaleNotificationEmail(email, data);
      this.logger.info(`Author sale notification email sent to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
        orderId: data.orderId,
      });
    } catch (error) {
      this.logger.error(`Failed to send author sale email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      // Author sale notifications are non-critical — balance is already recorded
      // Don't throw, just log
    }
  }

  private async handleAuthorOnboardingApprovedEmail(
    job: Job<EmailJob>,
  ): Promise<void> {
    const jobData = job.data as Extract<
      EmailJob,
      { type: 'author-onboarding-approved' }
    >;
    const { email, username } = jobData;

    try {
      await this.emailService.sendAuthorOnboardingApprovedEmail(
        email,
        username,
      );
      this.logger.info(`Author onboarding approved email sent to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send author onboarding approved email to ${email}`,
        {
          context: 'EmailProcessor',
          email,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Non-critical — the account is already approved
    }
  }

  private async handleContactUsEmail(job: Job<EmailJob>): Promise<void> {
    const jobData = job.data as Extract<EmailJob, { type: 'contact-us' }>;
    const { name, email, subject, message } = jobData;

    try {
      await this.emailService.sendContactUsEmail(name, email, subject, message);
      this.logger.info(`Contact us email sent from ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(`Failed to send contact us email from ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Re-throw to trigger retry
    }
  }
}
