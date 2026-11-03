import { SubscribeToNewsletterUseCase } from './subscribe-to-newsletter.use-case';
import { INewsletterSubscriberRepository } from '../../domain/interfaces/newsletter-subscriber.repository.interface';
import { IEmailSender } from '../../../common/domain/interfaces/email-sender.interface';
import { AppError } from '../../../common/errors/app.error';

describe('SubscribeToNewsletterUseCase', () => {
  let useCase: SubscribeToNewsletterUseCase;
  let mockRepo: jest.Mocked<INewsletterSubscriberRepository>;
  let mockEmailSender: jest.Mocked<IEmailSender>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
    };

    mockEmailSender = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendNewsletterWelcomeEmail: jest.fn(),
      sendOrderReceiptEmail: jest.fn(),
      sendAuthorSaleNotificationEmail: jest.fn(),
      sendAuthorOnboardingApprovedEmail: jest.fn(),
      sendContactUsEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendAuthorPendingApprovalEmail: jest.fn(),
      sendNewAuthorAdminNotificationEmail: jest.fn(),
      sendTaxFormSubmittedAdminNotificationEmail: jest.fn(),
      sendKycApprovedEmail: jest.fn(),
      sendKycRejectedEmail: jest.fn(),
    };

    useCase = new SubscribeToNewsletterUseCase(mockRepo, mockEmailSender);
  });

  it('subscribes a new email and dispatches a welcome confirmation email', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      id: 'sub-123',
      email: 'reader@example.com',
      createdAt: new Date(),
    });

    const result = await useCase.execute(' Reader@Example.com ');

    expect(mockRepo.findByEmail).toHaveBeenCalledWith('reader@example.com');
    expect(mockRepo.create).toHaveBeenCalledWith('reader@example.com');
    expect(mockEmailSender.sendNewsletterWelcomeEmail).toHaveBeenCalledWith(
      'reader@example.com',
    );
    expect(result.id).toBe('sub-123');
    expect(result.email).toBe('reader@example.com');
  });

  it('throws a bad request error if email is already subscribed', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'existing-sub',
      email: 'already@subscribed.com',
      createdAt: new Date(),
    });

    await expect(useCase.execute('already@subscribed.com')).rejects.toThrow(
      AppError,
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockEmailSender.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it('throws an error if email is empty or whitespace', async () => {
    await expect(useCase.execute('   ')).rejects.toThrow(
      'Email address is required.',
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('still creates subscriber even if welcome email sending fails', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      id: 'sub-456',
      email: 'reader2@example.com',
      createdAt: new Date(),
    });
    mockEmailSender.sendNewsletterWelcomeEmail.mockRejectedValue(
      new Error('SMTP timeout'),
    );

    const result = await useCase.execute('reader2@example.com');

    expect(mockRepo.create).toHaveBeenCalledWith('reader2@example.com');
    expect(result.id).toBe('sub-456');
  });
});
