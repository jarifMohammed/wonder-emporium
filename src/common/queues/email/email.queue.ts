import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  IEmailSender,
  OrderReceiptData,
  AuthorSaleNotificationData,
} from '../../domain/interfaces/email-sender.interface';

export interface VerificationEmailJob {
  type: 'verification';
  email: string;
  username: string;
  verificationCode: string;
  authId: string;
}

export interface WelcomeEmailJob {
  type: 'welcome';
  email: string;
  username: string;
  authId?: string;
}

export interface OrderReceiptEmailJob {
  type: 'order-receipt';
  email: string;
  data: OrderReceiptData;
}

export interface AuthorSaleEmailJob {
  type: 'author-sale';
  email: string;
  data: AuthorSaleNotificationData;
}

export interface AuthorOnboardingApprovedEmailJob {
  type: 'author-onboarding-approved';
  email: string;
  username: string;
}

export type EmailJob =
  | VerificationEmailJob
  | WelcomeEmailJob
  | OrderReceiptEmailJob
  | AuthorSaleEmailJob
  | AuthorOnboardingApprovedEmailJob
  | ContactUsEmailJob;

export interface ContactUsEmailJob {
  type: 'contact-us';
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable()
export class EmailQueueService implements IEmailSender {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
    authId: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-verification',
      {
        type: 'verification',
        email,
        username,
        verificationCode,
        authId,
      } as VerificationEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendWelcomeEmail(
    email: string,
    username: string,
    authId?: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-welcome',
      {
        type: 'welcome',
        email,
        username,
        authId,
      } as WelcomeEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendOrderReceiptEmail(
    email: string,
    data: OrderReceiptData,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-order-receipt',
      {
        type: 'order-receipt',
        email,
        data,
      } as OrderReceiptEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendAuthorSaleNotificationEmail(
    email: string,
    data: AuthorSaleNotificationData,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-author-sale',
      {
        type: 'author-sale',
        email,
        data,
      } as AuthorSaleEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendAuthorOnboardingApprovedEmail(
    email: string,
    username: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-author-onboarding-approved',
      {
        type: 'author-onboarding-approved',
        email,
        username,
      } as AuthorOnboardingApprovedEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendContactUsEmail(
    name: string,
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-contact-us',
      {
        type: 'contact-us',
        name,
        email,
        subject,
        message,
      } as ContactUsEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
