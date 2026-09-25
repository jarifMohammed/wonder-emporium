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
  from?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private msGraphToken: string | null = null;
  private msGraphTokenExpiresAt: number = 0;

  constructor(private readonly customLogger: CustomLoggerService) {
    if (config.email_host && config.email_user) {
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
  }

  private isMicrosoftGraphConfigured(): boolean {
    return Boolean(
      config.microsoft_tenant_id &&
        config.microsoft_client_id &&
        config.microsoft_client_secret,
    );
  }

  private async getMicrosoftGraphAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.msGraphToken && this.msGraphTokenExpiresAt > now + 60_000) {
      return this.msGraphToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${config.microsoft_tenant_id}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', config.microsoft_client_id);
    params.append('client_secret', config.microsoft_client_secret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorData = await res.text();
      this.customLogger.error(
        `Failed to get Microsoft Graph access token: ${errorData}`,
        undefined,
        'EmailService',
      );
      throw AppError.internalServerError(
        'Failed to authenticate with Microsoft email service.',
      );
    }

    const tokenData = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.msGraphToken = tokenData.access_token;
    this.msGraphTokenExpiresAt =
      now + (Number(tokenData.expires_in) || 3600) * 1000;
    return this.msGraphToken;
  }

  private async sendViaMicrosoftGraph(options: EmailOptions): Promise<void> {
    const token = await this.getMicrosoftGraphAccessToken();
    const senderEmail = options.from || config.email_from || config.email_user;

    if (!senderEmail) {
      throw AppError.internalServerError(
        'Sender email (EMAIL_FROM / EMAIL_USER) is not configured.',
      );
    }

    const mailPayload = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.html ? 'HTML' : 'Text',
          content: options.html || options.text || '',
        },
        toRecipients: [
          {
            emailAddress: {
              address: options.to,
            },
          },
        ],
      },
      saveToSentItems: 'true',
    };

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailPayload),
      },
    );

    if (res.status !== 202 && !res.ok) {
      const errorText = await res.text();
      this.customLogger.error(
        `Microsoft Graph sendMail failed with status ${res.status}: ${errorText}`,
        undefined,
        'EmailService',
      );
      throw AppError.badRequest(`Microsoft email sending failed: ${errorText}`);
    }

    this.customLogger.log(
      `Email successfully sent via Microsoft Graph API to: ${options.to}`,
      'EmailService',
    );
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    this.customLogger.log(
      `Sending email to: ${options.to}, subject: ${options.subject}`,
      'EmailService',
    );

    let graphError: unknown = null;

    if (this.isMicrosoftGraphConfigured()) {
      try {
        await this.sendViaMicrosoftGraph(options);
        return;
      } catch (err) {
        graphError = err;
        this.customLogger.warn(
          `Microsoft Graph email delivery failed (${err instanceof Error ? err.message : String(err)}). Attempting SMTP fallback...`,
          'EmailService',
        );
      }
    }

    try {
      if (!this.transporter) {
        if (graphError) {
          throw graphError;
        }
        throw AppError.internalServerError(
          'Email transporter is not configured.',
        );
      }

      const mailOptions = {
        from: options.from || String(config.email_from || config.email_user),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      await this.transporter.sendMail(mailOptions);
      this.customLogger.log(
        `Email sent successfully via SMTP to: ${options.to}`,
        'EmailService',
      );
    } catch (error) {
      this.customLogger.error(
        `Error sending email to ${options.to}`,
        error instanceof Error ? error.stack : undefined,
        'EmailService',
      );
      console.error('Error sending email:', error);
      throw error instanceof AppError
        ? error
        : AppError.badRequest('Email sending failed, something went wrong!');
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
    console.log(
      `\n=========================================\n[AUTH VERIFICATION OTP]\nRecipient: ${email}\nVerification Code: ${verificationCode}\n=========================================\n`,
    );

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

  /**
   * Notify admin that an author submitted KYC / tax forms
   */
  async sendTaxFormSubmittedAdminNotificationEmail(data: {
    authorId: string;
    authorEmail: string;
    authorUsername: string;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@wonderemporium.com';
    await this.sendEmail({
      to: adminEmail,
      subject: `KYC Review Required: ${data.authorUsername} has submitted tax forms`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#24352f;">📋 New KYC Submission</h2>
          <p>An author has submitted their identity documents and tax forms for review.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Author ID</td><td style="padding:8px;">${data.authorId}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Username</td><td style="padding:8px;">${data.authorUsername}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Email</td><td style="padding:8px;">${data.authorEmail}</td></tr>
          </table>
          <p>Please log in to the admin dashboard to review and approve or reject the submission.</p>
          <p style="color:#888;font-size:12px;">Wonder Emporium &copy; ${new Date().getFullYear()}</p>
        </div>
      `,
    });
  }

  /**
   * Notify author that their KYC was approved
   */
  async sendKycApprovedEmail(email: string, username: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: '✅ Your identity verification has been approved!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#24352f;">🎉 KYC Approved</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Great news! Your identity documents and tax forms have been reviewed and <strong>approved</strong> by our team.</p>
          <p>You can now create and publish books on Wonder Emporium. Head to your dashboard to get started!</p>
          <p style="color:#888;font-size:12px;">Wonder Emporium &copy; ${new Date().getFullYear()}</p>
        </div>
      `,
    });
  }

  /**
   * Notify author that their KYC was rejected
   */
  async sendKycRejectedEmail(email: string, username: string, adminNote?: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: '❌ Your identity verification needs attention',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#c0392b;">KYC Submission Rejected</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Unfortunately, your KYC submission could not be approved at this time.</p>
          ${adminNote ? `<div style="background:#fff3cd;border-left:4px solid #cfaf45;padding:12px 16px;margin:16px 0;"><strong>Admin Note:</strong> ${adminNote}</div>` : ''}
          <p>Please log in to your dashboard, correct any issues, and resubmit your documents.</p>
          <p>If you believe this is an error, please contact our support team.</p>
          <p style="color:#888;font-size:12px;">Wonder Emporium &copy; ${new Date().getFullYear()}</p>
        </div>
      `,
    });
  }
}
