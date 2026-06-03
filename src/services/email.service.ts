import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename?: string;
    content: Buffer | string;
    contentType?: string;
    cid?: string;
    encoding?: string;
  }>;
}

class EmailService {
  private hasLoggedTransportHealth = false;

  private getSmtpUser(): string | undefined {
    return process.env.EMAIL_USER || process.env.SMTP_USER;
  }

  private getSmtpPass(): string | undefined {
    return process.env.EMAIL_PASS || process.env.SMTP_PASS;
  }

  private readonly smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  private readonly primaryPort = Number(process.env.SMTP_PORT || 465);
  private readonly primarySecure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : this.primaryPort === 465;
  private readonly fallbackPort = Number(
    process.env.SMTP_FALLBACK_PORT || (this.primaryPort === 465 ? 587 : 465)
  );
  private readonly fallbackSecure =
    process.env.SMTP_FALLBACK_SECURE !== undefined
      ? process.env.SMTP_FALLBACK_SECURE === 'true'
      : this.fallbackPort === 465;

  private createTransport(port: number, secure: boolean) {
    return nodemailer.createTransport({
      host: this.smtpHost,
      port,
      secure,
      requireTLS: !secure,
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30000),
      auth:
        this.getSmtpUser() && this.getSmtpPass()
          ? {
              user: this.getSmtpUser(),
              pass: this.getSmtpPass(),
            }
          : undefined,
    });
  }

  private primaryTransporter = this.createTransport(this.primaryPort, this.primarySecure);
  private fallbackTransporter =
    this.fallbackPort !== this.primaryPort || this.fallbackSecure !== this.primarySecure
      ? this.createTransport(this.fallbackPort, this.fallbackSecure)
      : null;

  private getFromAddress(): string {
    if (process.env.EMAIL_FROM) {
      return process.env.EMAIL_FROM;
    }

    if (process.env.SMTP_FROM) {
      return process.env.SMTP_FROM;
    }

    if (this.getSmtpUser()) {
      return this.getSmtpUser() as string;
    }

    throw new AppError('EMAIL_FROM or EMAIL_USER must be configured', 500);
  }

  private getFromLabel(): string {
    const fromAddress = this.getFromAddress();
    if (process.env.EMAIL_FROM_NAME) {
      return `${process.env.EMAIL_FROM_NAME} <${fromAddress}>`;
    }

    return fromAddress;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private getErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const maybeCode = (error as { code?: unknown }).code;
      if (typeof maybeCode === 'string') {
        return maybeCode;
      }
    }

    return '';
  }

  private isRetryableTransportError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const code = this.getErrorCode(error).toUpperCase();

    return (
      code === 'ETIMEDOUT' ||
      code === 'ECONNECTION' ||
      code === 'ECONNRESET' ||
      message.includes('timeout') ||
      message.includes('connection')
    );
  }

  private async logTransportHealthOnce() {
    if (this.hasLoggedTransportHealth) {
      return;
    }

    this.hasLoggedTransportHealth = true;

    try {
      await this.primaryTransporter.verify();
      logger.info('[email] primary SMTP transporter verified', {
        host: this.smtpHost,
        port: this.primaryPort,
        secure: this.primarySecure,
      });
    } catch (error) {
      logger.warn('[email] primary SMTP transporter verification failed', {
        host: this.smtpHost,
        port: this.primaryPort,
        secure: this.primarySecure,
        error: this.getErrorMessage(error),
      });
    }

    if (this.fallbackTransporter) {
      try {
        await this.fallbackTransporter.verify();
        logger.info('[email] fallback SMTP transporter verified', {
          host: this.smtpHost,
          port: this.fallbackPort,
          secure: this.fallbackSecure,
        });
      } catch (error) {
        logger.warn('[email] fallback SMTP transporter verification failed', {
          host: this.smtpHost,
          port: this.fallbackPort,
          secure: this.fallbackSecure,
          error: this.getErrorMessage(error),
        });
      }
    }
  }

  async sendTextEmail(input: SendEmailInput): Promise<{ messageId: string }> {
    if (!this.getSmtpUser() || !this.getSmtpPass()) {
      throw new AppError('Email SMTP credentials are not configured', 500);
    }

    void this.logTransportHealthOnce();

    try {
      const response = await this.primaryTransporter.sendMail({
        from: this.getFromLabel(),
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments,
      });

      return {
        messageId: response.messageId,
      };
    } catch (error) {
      logger.warn('Primary SMTP send failed', {
        to: input.to,
        subject: input.subject,
        host: this.smtpHost,
        port: this.primaryPort,
        secure: this.primarySecure,
        code: this.getErrorCode(error),
        error: this.getErrorMessage(error),
      });

      if (this.fallbackTransporter && this.isRetryableTransportError(error)) {
        try {
          const fallbackResponse = await this.fallbackTransporter.sendMail({
            from: this.getFromLabel(),
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
            attachments: input.attachments,
          });

          logger.info('Fallback SMTP send succeeded', {
            to: input.to,
            subject: input.subject,
            host: this.smtpHost,
            port: this.fallbackPort,
            secure: this.fallbackSecure,
          });

          return {
            messageId: fallbackResponse.messageId,
          };
        } catch (fallbackError) {
          logger.error('Fallback SMTP send failed', {
            to: input.to,
            subject: input.subject,
            host: this.smtpHost,
            port: this.fallbackPort,
            secure: this.fallbackSecure,
            code: this.getErrorCode(fallbackError),
            error: this.getErrorMessage(fallbackError),
          });
        }
      }

      logger.error('Email send failed', {
        to: input.to,
        subject: input.subject,
        host: this.smtpHost,
        primaryPort: this.primaryPort,
        fallbackPort: this.fallbackTransporter ? this.fallbackPort : null,
      });

      throw new AppError('Failed to send email via SMTP', 500);
    }
  }
}

export const emailService = new EmailService();
