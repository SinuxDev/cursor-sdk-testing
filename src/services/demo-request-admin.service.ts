import mongoose from 'mongoose';
import {
  DemoReplyTemplateKey,
  DemoRequestPriority,
  DemoRequestStatus,
} from '../models/demo-request.model';
import { adminAuditLogRepository } from '../repositories/admin-audit-log.repository';
import {
  DemoRequestAnalyticsData,
  demoRequestRepository,
} from '../repositories/demo-request.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { renderDemoReplyTemplate } from '../lib/demo-reply-templates';
import { emailService } from './email.service';

type AnalyticsRange = '7d' | '30d' | '90d';

const FIRST_RESPONSE_SLA_MINUTES = 15;

function getRangeStart(range: AnalyticsRange): Date {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const from = new Date(now);
  from.setDate(now.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return from;
}

class DemoRequestAdminService {
  async listDemoRequests(params: {
    page?: number;
    limit?: number;
    status?: DemoRequestStatus;
    priority?: DemoRequestPriority;
    ownerAdminId?: string;
    source?: 'public-website' | 'authenticated-website';
    q?: string;
    from?: string;
    to?: string;
    sla?: 'all' | 'on_time' | 'overdue';
  }) {
    return demoRequestRepository.listWithFilters({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status,
      priority: params.priority,
      ownerAdminId: params.ownerAdminId,
      source: params.source,
      q: params.q,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      sla: params.sla ?? 'all',
      firstResponseSlaMinutes: FIRST_RESPONSE_SLA_MINUTES,
    });
  }

  async getDemoRequestById(id: string) {
    const request = await demoRequestRepository.findByIdWithOwner(id);
    if (!request) {
      throw new AppError('Demo request not found', 404);
    }

    return request;
  }

  async assignOwner(params: {
    actorUserId: string;
    demoRequestId: string;
    ownerAdminId: string;
    reason: string;
  }) {
    const request = await demoRequestRepository.findById(params.demoRequestId);
    if (!request) {
      throw new AppError('Demo request not found', 404);
    }

    const owner = await userRepository.findById(params.ownerAdminId);
    if (!owner || owner.role !== 'admin') {
      throw new AppError('Owner admin not found', 404);
    }

    request.ownerAdminId = new mongoose.Types.ObjectId(params.ownerAdminId);
    await request.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: request.ownerAdminId ?? new mongoose.Types.ObjectId(params.actorUserId),
      action: 'demo.request.assigned',
      reason: params.reason.trim(),
      metadata: {
        demoRequestId: request._id,
        ownerAdminId: owner._id,
      },
    });

    return demoRequestRepository.findByIdWithOwner(String(request._id));
  }

  async updateStatus(params: {
    actorUserId: string;
    demoRequestId: string;
    status: DemoRequestStatus;
    reason: string;
    qualificationNotes?: string;
    scheduledAt?: string;
    nextActionAt?: string;
  }) {
    const request = await demoRequestRepository.findById(params.demoRequestId);
    if (!request) {
      throw new AppError('Demo request not found', 404);
    }

    if (params.status === 'scheduled' && !params.scheduledAt) {
      throw new AppError('scheduledAt is required when status is scheduled', 400);
    }

    const previousStatus = request.status;
    request.status = params.status;

    if (params.qualificationNotes !== undefined) {
      request.qualificationNotes = params.qualificationNotes.trim();
    }

    if (params.scheduledAt) {
      request.scheduledAt = new Date(params.scheduledAt);
    }

    if (params.nextActionAt) {
      request.nextActionAt = new Date(params.nextActionAt);
    }

    if (params.status === 'contacted' && !request.firstResponseAt) {
      request.firstResponseAt = new Date();
      request.lastContactAt = new Date();
    }

    await request.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: request.ownerAdminId ?? new mongoose.Types.ObjectId(params.actorUserId),
      action: 'demo.request.status.updated',
      reason: params.reason.trim(),
      metadata: {
        demoRequestId: request._id,
        previousStatus,
        nextStatus: request.status,
      },
    });

    return demoRequestRepository.findByIdWithOwner(String(request._id));
  }

  async updateFollowUp(params: {
    actorUserId: string;
    demoRequestId: string;
    reason: string;
    lastContactAt?: string;
    nextActionAt?: string;
    qualificationNotes?: string;
    priority?: DemoRequestPriority;
  }) {
    const request = await demoRequestRepository.findById(params.demoRequestId);
    if (!request) {
      throw new AppError('Demo request not found', 404);
    }

    if (params.lastContactAt) {
      request.lastContactAt = new Date(params.lastContactAt);
      if (!request.firstResponseAt) {
        request.firstResponseAt = request.lastContactAt;
      }
    }

    if (params.nextActionAt) {
      request.nextActionAt = new Date(params.nextActionAt);
    }

    if (params.qualificationNotes !== undefined) {
      request.qualificationNotes = params.qualificationNotes.trim();
    }

    if (params.priority) {
      request.priority = params.priority;
    }

    await request.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: request.ownerAdminId ?? new mongoose.Types.ObjectId(params.actorUserId),
      action: 'demo.request.followup.updated',
      reason: params.reason.trim(),
      metadata: {
        demoRequestId: request._id,
      },
    });

    return demoRequestRepository.findByIdWithOwner(String(request._id));
  }

  async sendReply(params: {
    actorUserId: string;
    demoRequestId: string;
    templateKey: DemoReplyTemplateKey;
    reason: string;
    customMessage?: string;
    scheduleLink?: string;
  }) {
    const request = await demoRequestRepository.findById(params.demoRequestId);
    if (!request) {
      throw new AppError('Demo request not found', 404);
    }

    const supportName = process.env.EMAIL_FROM_NAME || 'EventForge Admin';
    const supportEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@example.com';
    const websiteUrl =
      process.env.EMAIL_WEBSITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

    const renderedTemplate = renderDemoReplyTemplate({
      templateKey: params.templateKey,
      recipientName: request.fullName,
      supportName,
      supportEmail,
      websiteUrl,
      scheduleLink: params.scheduleLink,
      customMessage: params.customMessage,
    });

    await emailService.sendTextEmail({
      to: request.workEmail,
      subject: renderedTemplate.subject,
      text: renderedTemplate.text,
      html: renderedTemplate.html,
    });

    const now = new Date();

    request.lastReplySentAt = now;
    request.lastReplyTemplateKey = params.templateKey;
    request.replyCount = (request.replyCount || 0) + 1;
    request.lastContactAt = now;

    if (!request.firstResponseAt) {
      request.firstResponseAt = now;
    }

    if (request.status === 'new') {
      request.status = 'contacted';
    }

    if (params.templateKey === 'acknowledgement' && !request.acknowledgementSentAt) {
      request.acknowledgementSentAt = now;
    }

    await request.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: request.ownerAdminId ?? new mongoose.Types.ObjectId(params.actorUserId),
      action: 'demo.request.reply.sent',
      reason: params.reason.trim(),
      metadata: {
        demoRequestId: request._id,
        templateKey: params.templateKey,
        replyCount: request.replyCount,
      },
    });

    return demoRequestRepository.findByIdWithOwner(String(request._id));
  }

  async getAnalytics(
    range: AnalyticsRange
  ): Promise<DemoRequestAnalyticsData & { meta: { range: AnalyticsRange; generatedAt: string } }> {
    const from = getRangeStart(range);
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    const data = await demoRequestRepository.getAnalytics({
      from,
      to,
      firstResponseSlaMinutes: FIRST_RESPONSE_SLA_MINUTES,
    });

    return {
      ...data,
      meta: {
        range,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const demoRequestAdminService = new DemoRequestAdminService();
