import mongoose, { FilterQuery } from 'mongoose';
import {
  AdminEmailAudienceMode,
  AdminEmailAudienceRole,
  IAdminEmailCampaign,
} from '../models/admin-email-campaign.model';
import { IAdminEmailDeliveryLog } from '../models/admin-email-delivery-log.model';
import { IUser } from '../models/user.model';
import { adminAuditLogRepository } from '../repositories/admin-audit-log.repository';
import { adminEmailCampaignRepository } from '../repositories/admin-email-campaign.repository';
import { adminEmailDeliveryLogRepository } from '../repositories/admin-email-delivery-log.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { AdminEmailTemplateKey, renderAdminEmailTemplate } from '../lib/email-templates';

interface SendCampaignParams {
  actorUserId: string;
  subject: string;
  body: string;
  templateKey: AdminEmailTemplateKey;
  audienceMode: AdminEmailAudienceMode;
  targetRoles: AdminEmailAudienceRole[];
  targetStatus: 'all' | 'active' | 'suspended';
  selectedUserIds?: string[];
  reason: string;
}

export interface SendCampaignResult {
  campaign: IAdminEmailCampaign;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
}

class AdminEmailService {
  private readonly MANUAL_AUDIENCE_MAX = 100;
  private readonly SEND_BATCH_SIZE = 10;

  private async findRecipients(params: {
    targetRoles: AdminEmailAudienceRole[];
    targetStatus: 'all' | 'active' | 'suspended';
  }) {
    const filter: FilterQuery<IUser> = {
      role: { $in: params.targetRoles },
    };

    if (params.targetStatus === 'active') {
      filter.isSuspended = false;
    }

    if (params.targetStatus === 'suspended') {
      filter.isSuspended = true;
    }

    return userRepository.findAll(filter, { sort: { createdAt: -1 } });
  }

  private async findRecipientsByUserIds(selectedUserIds: string[]) {
    const uniqueValidIds = Array.from(new Set(selectedUserIds)).filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (uniqueValidIds.length === 0) {
      throw new AppError('No valid selected users provided', 400);
    }

    if (uniqueValidIds.length > this.MANUAL_AUDIENCE_MAX) {
      throw new AppError(
        `Manual audience cannot exceed ${this.MANUAL_AUDIENCE_MAX} users per campaign`,
        400
      );
    }

    return userRepository.findAll(
      {
        _id: { $in: uniqueValidIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
      { sort: { createdAt: -1 } }
    );
  }

  private async sendToRecipientsInBatches(params: {
    recipients: IUser[];
    templateKey: AdminEmailTemplateKey;
    supportName: string;
    supportEmail: string;
    websiteUrl: string;
    policyUrl: string;
    helpUrl: string;
    appealUrl: string;
    customSubject: string;
    customBody: string;
  }) {
    const deliveryLogs: Array<Omit<Partial<IAdminEmailDeliveryLog>, 'campaignId'>> = [];

    for (let index = 0; index < params.recipients.length; index += this.SEND_BATCH_SIZE) {
      const batch = params.recipients.slice(index, index + this.SEND_BATCH_SIZE);

      const settledBatch = await Promise.allSettled(
        batch.map(async (recipient) => {
          const renderedTemplate = renderAdminEmailTemplate(params.templateKey, {
            supportName: params.supportName,
            supportEmail: params.supportEmail,
            websiteUrl: params.websiteUrl,
            policyUrl: params.policyUrl,
            helpUrl: params.helpUrl,
            appealUrl: params.appealUrl,
            recipientName: recipient.name,
            customSubject: params.customSubject,
            customBody: params.customBody,
          });

          const sendResult = await emailService.sendTextEmail({
            to: recipient.email,
            subject: renderedTemplate.subject,
            text: renderedTemplate.text,
            html: renderedTemplate.html,
          });

          return {
            recipient,
            messageId: sendResult.messageId,
          };
        })
      );

      settledBatch.forEach((result, batchIndex) => {
        const recipient = batch[batchIndex];

        if (!recipient) {
          return;
        }

        if (result.status === 'fulfilled') {
          deliveryLogs.push({
            recipientEmail: recipient.email,
            recipientUserId: recipient._id as mongoose.Types.ObjectId,
            status: 'sent',
            providerMessageId: result.value.messageId,
          });
          return;
        }

        deliveryLogs.push({
          recipientEmail: recipient.email,
          recipientUserId: recipient._id as mongoose.Types.ObjectId,
          status: 'failed',
          errorMessage:
            result.reason instanceof Error ? result.reason.message : 'Unknown email delivery error',
        });
      });
    }

    return deliveryLogs;
  }

  async sendCampaign(params: SendCampaignParams): Promise<SendCampaignResult> {
    const startedAt = Date.now();
    const supportName = process.env.EMAIL_FROM_NAME || 'EventForge Admin';
    const supportEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@example.com';
    const websiteUrl =
      process.env.EMAIL_WEBSITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const policyUrl = process.env.EMAIL_POLICY_URL || `${websiteUrl}/policy`;
    const helpUrl = process.env.EMAIL_HELP_URL || `${websiteUrl}/help`;
    const appealUrl = process.env.EMAIL_APPEAL_URL || `${websiteUrl}/appeal`;

    const campaignTemplatePreview = renderAdminEmailTemplate(params.templateKey, {
      supportName,
      supportEmail,
      websiteUrl,
      policyUrl,
      helpUrl,
      appealUrl,
      customSubject: params.subject,
      customBody: params.body,
    });

    const finalSubject = campaignTemplatePreview.subject;
    const finalBody = params.body.trim();

    const recipientResolutionStartedAt = Date.now();
    const recipients =
      params.audienceMode === 'manual'
        ? await this.findRecipientsByUserIds(params.selectedUserIds ?? [])
        : await this.findRecipients({
            targetRoles: params.targetRoles,
            targetStatus: params.targetStatus,
          });
    const recipientResolutionDurationMs = Date.now() - recipientResolutionStartedAt;

    if (recipients.length === 0) {
      throw new AppError('No recipients matched the selected audience', 400);
    }

    const deliveryStartedAt = Date.now();
    const deliveryLogsWithoutCampaign = await this.sendToRecipientsInBatches({
      recipients,
      templateKey: params.templateKey,
      supportName,
      supportEmail,
      websiteUrl,
      policyUrl,
      helpUrl,
      appealUrl,
      customSubject: params.subject,
      customBody: params.body,
    });
    const deliveryDurationMs = Date.now() - deliveryStartedAt;

    const sentCount = deliveryLogsWithoutCampaign.filter((log) => log.status === 'sent').length;
    const failedCount = deliveryLogsWithoutCampaign.filter((log) => log.status === 'failed').length;

    const persistenceStartedAt = Date.now();
    const campaign = await adminEmailCampaignRepository.create({
      subject: finalSubject,
      body: finalBody,
      audienceMode: params.audienceMode,
      targetRoles: params.targetRoles,
      targetStatus: params.targetStatus,
      selectedUserIds:
        params.audienceMode === 'manual'
          ? recipients.map((user) => user._id as mongoose.Types.ObjectId)
          : [],
      createdByAdminId: new mongoose.Types.ObjectId(params.actorUserId),
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      status: sentCount > 0 ? 'completed' : 'failed',
    } as Partial<IAdminEmailCampaign>);

    const deliveryLogs = deliveryLogsWithoutCampaign.map((log) => ({
      ...log,
      campaignId: campaign._id as mongoose.Types.ObjectId,
    }));

    if (deliveryLogs.length > 0) {
      await adminEmailDeliveryLogRepository.bulkCreate(
        deliveryLogs as Partial<IAdminEmailDeliveryLog>[]
      );
    }
    const persistenceDurationMs = Date.now() - persistenceStartedAt;

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: new mongoose.Types.ObjectId(params.actorUserId),
      action: 'admin.email.campaign.sent',
      reason: params.reason.trim(),
      metadata: {
        campaignId: String(campaign._id),
        audienceMode: params.audienceMode,
        targetRoles: campaign.targetRoles,
        targetStatus: campaign.targetStatus,
        selectedUserCount: campaign.selectedUserIds.length,
        templateKey: params.templateKey,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      },
    });

    const totalDurationMs = Date.now() - startedAt;
    logger.info('[admin-email] sendCampaign metrics', {
      audienceMode: params.audienceMode,
      recipients: recipients.length,
      sentCount,
      failedCount,
      recipientResolutionDurationMs,
      deliveryDurationMs,
      persistenceDurationMs,
      totalDurationMs,
    });

    return {
      campaign,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
    };
  }

  async listCampaigns(page: number = 1, limit: number = 20) {
    return adminEmailCampaignRepository.listWithPagination(page, limit);
  }

  async listCampaignDeliveryLogs(campaignId: string, page: number = 1, limit: number = 20) {
    const campaign = await adminEmailCampaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError('Email campaign not found', 404);
    }

    return adminEmailDeliveryLogRepository.listByCampaign(campaignId, page, limit);
  }
}

export const adminEmailService = new AdminEmailService();
