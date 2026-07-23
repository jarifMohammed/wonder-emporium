export interface OrderReceiptData {
  orderId: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

export interface AuthorSaleNotificationData {
  orderId: string;
  earningsAmount: number;
  platformFee: number;
  currency: string;
}

export interface IEmailSender {
  sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
    authId: string,
  ): Promise<void>;

  sendWelcomeEmail(
    email: string,
    username: string,
    authId?: string,
  ): Promise<void>;

  sendOrderReceiptEmail(email: string, data: OrderReceiptData): Promise<void>;

  sendAuthorSaleNotificationEmail(
    email: string,
    data: AuthorSaleNotificationData,
  ): Promise<void>;

  sendAuthorOnboardingApprovedEmail(
    email: string,
    username: string,
  ): Promise<void>;

  sendContactUsEmail(
    name: string,
    email: string,
    subject: string,
    message: string,
  ): Promise<void>;

  sendPasswordResetEmail(
    email: string,
    username: string,
    resetCode: string,
  ): Promise<void>;

  sendAuthorPendingApprovalEmail(
    email: string,
    username: string,
  ): Promise<void>;

  sendNewAuthorAdminNotificationEmail(data: {
    authorId: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<void>;
}

export const EMAIL_SENDER_TOKEN = Symbol('IEmailSender');
