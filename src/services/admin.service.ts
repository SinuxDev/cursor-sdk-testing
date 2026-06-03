import mongoose, { FilterQuery } from 'mongoose';
import { IUser, UserRole } from '../models/user.model';
import { IAdminAuditLog } from '../models/admin-audit-log.model';
import { adminAuditLogRepository } from '../repositories/admin-audit-log.repository';
import { eventRepository } from '../repositories/event.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { renderRoleChangeEmailTemplate } from '../lib/role-change-email-template';
import { renderSuspensionStatusEmailTemplate } from '../lib/suspension-status-email-template';
import { emailService } from './email.service';

interface ListUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRole;
  isSuspended?: boolean;
}

interface UpdateRoleParams {
  actorUserId: string;
  targetUserId: string;
  role: UserRole;
  reason: string;
}

interface UpdateSuspensionParams {
  actorUserId: string;
  targetUserId: string;
  isSuspended: boolean;
  reason: string;
}

interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  action?: IAdminAuditLog['action'];
  targetUserId?: string;
  actorUserId?: string;
}

interface ListEventsParams {
  page?: number;
  limit?: number;
  q?: string;
  organizer?: string;
  organizerId?: string;
  status?: 'draft' | 'published' | 'cancelled';
  startDateFrom?: string;
  startDateTo?: string;
  sort?: 'start_asc' | 'start_desc' | 'created_desc';
}

class AdminService {
  private getEmailContext() {
    return {
      supportName: process.env.EMAIL_FROM_NAME || 'EventForge Support',
      supportEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@example.com',
      websiteUrl:
        process.env.EMAIL_WEBSITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000',
    };
  }

  async listUsers(params: ListUsersParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const filter: FilterQuery<IUser> = {};

    if (params.role) {
      filter.role = params.role;
    }

    if (typeof params.isSuspended === 'boolean') {
      filter.isSuspended = params.isSuspended;
    }

    if (params.q) {
      const keyword = params.q.trim();
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
      ];
    }

    return userRepository.findWithPagination(filter, page, limit, { createdAt: -1 });
  }

  async updateUserRole(params: UpdateRoleParams): Promise<IUser> {
    if (params.actorUserId === params.targetUserId) {
      throw new AppError('You cannot change your own role', 400);
    }

    const targetUser = await userRepository.findById(params.targetUserId);

    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    if (targetUser.role === 'admin' && params.role !== 'admin') {
      const adminCount = await userRepository.count({ role: 'admin' } as FilterQuery<IUser>);
      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last admin', 400);
      }
    }

    const previousRole = targetUser.role;

    targetUser.role = params.role;
    await targetUser.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: new mongoose.Types.ObjectId(params.targetUserId),
      action: 'user.role.updated',
      reason: params.reason.trim(),
      metadata: {
        previousRole,
        nextRole: params.role,
      },
    });

    const emailContext = this.getEmailContext();

    try {
      const template = renderRoleChangeEmailTemplate({
        recipientName: targetUser.name,
        previousRole,
        nextRole: params.role,
        reason: params.reason,
        supportName: emailContext.supportName,
        supportEmail: emailContext.supportEmail,
        websiteUrl: emailContext.websiteUrl,
      });

      await emailService.sendTextEmail({
        to: targetUser.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    } catch (error) {
      logger.warn('[admin] role change email failed', {
        targetUserId: params.targetUserId,
        recipientEmail: targetUser.email,
        previousRole,
        nextRole: params.role,
        error: error instanceof Error ? error.message : 'Unknown email delivery error',
      });
    }

    return targetUser;
  }

  async updateUserSuspension(params: UpdateSuspensionParams): Promise<IUser> {
    if (params.actorUserId === params.targetUserId) {
      throw new AppError('You cannot change your own suspension status', 400);
    }

    const targetUser = await userRepository.findById(params.targetUserId);

    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    if (targetUser.role === 'admin' && params.isSuspended) {
      const adminCount = await userRepository.count({ role: 'admin' } as FilterQuery<IUser>);
      if (adminCount <= 1) {
        throw new AppError('Cannot suspend the last admin', 400);
      }
    }

    const previousSuspendedState = targetUser.isSuspended;

    targetUser.isSuspended = params.isSuspended;
    await targetUser.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: new mongoose.Types.ObjectId(params.targetUserId),
      action: 'user.suspension.updated',
      reason: params.reason.trim(),
      metadata: {
        previousSuspendedState,
        nextSuspendedState: params.isSuspended,
      },
    });

    const emailContext = this.getEmailContext();

    try {
      const template = renderSuspensionStatusEmailTemplate({
        recipientName: targetUser.name,
        isSuspended: params.isSuspended,
        reason: params.reason,
        supportName: emailContext.supportName,
        supportEmail: emailContext.supportEmail,
        websiteUrl: emailContext.websiteUrl,
      });

      await emailService.sendTextEmail({
        to: targetUser.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    } catch (error) {
      logger.warn('[admin] suspension status email failed', {
        targetUserId: params.targetUserId,
        recipientEmail: targetUser.email,
        previousSuspendedState,
        nextSuspendedState: params.isSuspended,
        error: error instanceof Error ? error.message : 'Unknown email delivery error',
      });
    }

    return targetUser;
  }

  async listAuditLogs(params: ListAuditLogsParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    return adminAuditLogRepository.findWithFilters({
      page,
      limit,
      action: params.action,
      targetUserId: params.targetUserId,
      actorUserId: params.actorUserId,
    });
  }

  async listEvents(params: ListEventsParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    return eventRepository.findAdminEvents({
      page,
      limit,
      query: params.q?.trim() || undefined,
      organizer: params.organizer?.trim() || undefined,
      organizerId: params.organizerId,
      status: params.status,
      startDateFrom: params.startDateFrom ? new Date(params.startDateFrom) : undefined,
      startDateTo: params.startDateTo ? new Date(params.startDateTo) : undefined,
      sort: params.sort,
    });
  }

  async getEventById(eventId: string) {
    const event = await eventRepository.findByIdRaw(eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }
}

export const adminService = new AdminService();
