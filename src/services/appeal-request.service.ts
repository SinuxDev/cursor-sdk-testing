import { appealRequestRepository } from '../repositories/appeal-request.repository';
import { renderAppealStatusEmailTemplate } from '../lib/appeal-status-email-template';
import { emailService } from './email.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface CreateAppealRequestPayload {
  fullName: string;
  workEmail: string;
  company: string;
  accountEmail: string;
  issueType:
    | 'account_suspension'
    | 'policy_warning'
    | 'payment_restriction'
    | 'content_violation'
    | 'other';
  timeline: string;
  whatHappened: string;
  correctiveActions: string;
  evidenceLinks?: string[];
  consent: boolean;
  source?: 'public-website' | 'authenticated-website';
}

class AppealRequestService {
  private generateReferenceCode(): string {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `APR-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
  }

  async create(payload: CreateAppealRequestPayload) {
    let referenceCode = this.generateReferenceCode();

    // Extremely low collision risk, still guarded.
    while (await appealRequestRepository.findByReferenceCode(referenceCode)) {
      referenceCode = this.generateReferenceCode();
    }

    return appealRequestRepository.create({
      ...payload,
      referenceCode,
      status: 'submitted',
      source: payload.source || 'public-website',
      evidenceLinks: payload.evidenceLinks || [],
    });
  }

  async listAppeals(params: {
    page?: number;
    limit?: number;
    status?: 'submitted' | 'in_review' | 'resolved' | 'rejected';
    issueType?:
      | 'account_suspension'
      | 'policy_warning'
      | 'payment_restriction'
      | 'content_violation'
      | 'other';
    source?: 'public-website' | 'authenticated-website';
    q?: string;
  }) {
    return appealRequestRepository.listWithFilters({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status,
      issueType: params.issueType,
      source: params.source,
      q: params.q,
    });
  }

  async updateStatus(params: {
    appealId: string;
    status: 'submitted' | 'in_review' | 'resolved' | 'rejected';
  }) {
    const appeal = await appealRequestRepository.findById(params.appealId);

    if (!appeal) {
      throw new AppError('Appeal request not found', 404);
    }

    appeal.status = params.status;
    await appeal.save();

    const supportName = process.env.EMAIL_FROM_NAME || 'EventForge Trust Team';
    const supportEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@example.com';
    const websiteUrl =
      process.env.EMAIL_WEBSITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

    const recipientEmail = appeal.workEmail || appeal.accountEmail;

    try {
      const template = renderAppealStatusEmailTemplate({
        recipientName: appeal.fullName,
        status: appeal.status,
        referenceCode: appeal.referenceCode,
        issueType: appeal.issueType,
        supportName,
        supportEmail,
        websiteUrl,
      });

      await emailService.sendTextEmail({
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    } catch (error) {
      logger.warn('[appeal] status update email failed', {
        appealId: String(appeal._id),
        referenceCode: appeal.referenceCode,
        recipientEmail,
        status: appeal.status,
        error: error instanceof Error ? error.message : 'Unknown email delivery error',
      });
    }

    return appeal;
  }
}

export const appealRequestService = new AppealRequestService();
