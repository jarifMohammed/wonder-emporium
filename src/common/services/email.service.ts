import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/app.config';
import AppError from '../errors/app.error';
import { CustomLoggerService } from './custom-logger.service';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly customLogger: CustomLoggerService) {
    this.transporter = nodemailer.createTransport({
      host: String(config.email_host),
      port: Number(config.email_port),
      secure: config.email_port === 465, // true for 465, false for other ports
      auth: {
        user: String(config.email_user),
        pass: String(config.email_pass),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    this.customLogger.log(
      `Sending email to: ${options.to}, subject: ${options.subject}`,
      'EmailService',
    );
    const mailOptions = {
      from: String(config.email_from || config.email_user),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.customLogger.log(
        `Email sent successfully to: ${options.to}`,
        'EmailService',
      );
    } catch (error) {
      this.customLogger.error(
        `Error sending email to ${options.to}`,
        error instanceof Error ? error.stack : undefined,
        'EmailService',
      );
      console.error('Error sending email:', error);
      throw AppError.badRequest('Email sending failed, something went wrong!');
    }
  }

  /**
   * Load and parse email template
   */
  getEmailTemplate(
    filePath: string,
    replacements: Record<string, string>,
  ): string {
    try {
      const absolutePath = path.resolve(
        process.cwd(),
        'templates',
        'emails',
        filePath,
      );
      let template = fs.readFileSync(absolutePath, { encoding: 'utf-8' });

      for (const key in replacements) {
        template = template.replace(
          new RegExp(`{{${key}}}`, 'g'),
          replacements[key],
        );
      }

      return template;
    } catch (error) {
      console.error('Error reading email template:', error);
      throw AppError.internalServerError('Email template loading failed.');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('verification.html', {
      username,
      verificationCode,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetCode: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('password-reset.html', {
      username,
      resetCode,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const html = this.getEmailTemplate('welcome.html', {
      username,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Welcome to our platform!',
      html,
    });
  }

  /**
   * Send order receipt email to buyer
   */
  async sendOrderReceiptEmail(
    email: string,
    data: {
      orderId: string;
      totalAmount: number;
      taxAmount: number;
      currency: string;
      items: Array<{ name: string; quantity: number; unitPrice: number }>;
    },
  ): Promise<void> {
    const itemsHtml = data.items
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">${data.currency.toUpperCase()} ${item.unitPrice.toFixed(2)}</td></tr>`,
      )
      .join('');

    const tableHtml = `<table style="width:100%;border-collapse:collapse;"><tr><th style="text-align:left;padding:8px 4px;border-bottom:1px solid #eee;color:#666;font-size:12px;text-transform:uppercase;">Item</th><th style="text-align:center;padding:8px 4px;border-bottom:1px solid #eee;color:#666;font-size:12px;text-transform:uppercase;">Qty</th><th style="text-align:right;padding:8px 4px;border-bottom:1px solid #eee;color:#666;font-size:12px;text-transform:uppercase;">Price</th></tr>${itemsHtml}</table>`;

    const html = this.getEmailTemplate('order-receipt.html', {
      orderId: data.orderId,
      totalAmount: data.totalAmount.toFixed(2),
      taxAmount: data.taxAmount.toFixed(2),
      currency: data.currency.toUpperCase(),
      itemsHtml: tableHtml,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: `Order Confirmed — ${data.orderId}`,
      html,
    });
  }

  /**
   * Send sale notification email to author
   */
  async sendAuthorSaleNotificationEmail(
    email: string,
    data: {
      orderId: string;
      earningsAmount: number;
      platformFee: number;
      currency: string;
    },
  ): Promise<void> {
    const html = this.getEmailTemplate('author-sale-notification.html', {
      orderId: data.orderId,
      earningsAmount: data.earningsAmount.toFixed(2),
      platformFee: data.platformFee.toFixed(2),
      currency: data.currency.toUpperCase(),
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'You made a sale! 💰',
      html,
    });
  }

  /**
   * Send onboarding approved email to author
   */
  async sendAuthorOnboardingApprovedEmail(
    email: string,
    username: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('author-onboarding-approved.html', {
      username,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Your author account is approved! 🚀',
      html,
    });
  }

  async sendAuthorPendingApprovalEmail(
    email: string,
    username: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('author-pending-approval.html', {
      username,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Your author application is under review',
      html,
    });
  }

  async sendNewAuthorAdminNotificationEmail(data: {
    authorId: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@wonderemporium.com';
    const html = this.getEmailTemplate('new-author-admin.html', {
      authorId: data.authorId,
      authorName: `${data.firstName} ${data.lastName}`.trim(),
      authorEmail: data.email,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: adminEmail,
      subject: `New author awaiting approval: ${data.firstName} ${data.lastName}`,
      html,
    });
  }

  /**
   * Send contact us email to admin
   */
  async sendContactUsEmail(
    name: string,
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('contact-us.html', {
      name,
      email,
      message,
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@wonderemporium.com';

    await this.sendEmail({
      to: adminEmail,
      subject: `Contact Us: ${subject}`,
      html,
    });
  }
}
