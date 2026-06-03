import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { adminEmailService } from '../services/admin-email.service';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/AppError';

class AdminEmailController {
  sendCampaign = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await adminEmailService.sendCampaign({
      actorUserId: String(req.user._id),
      subject: req.body.subject,
      body: req.body.body,
      templateKey: req.body.templateKey,
      audienceMode: req.body.audienceMode,
      targetRoles: req.body.targetRoles,
      targetStatus: req.body.targetStatus,
      selectedUserIds: req.body.selectedUserIds,
      reason: req.body.reason,
    });

    if (result.sentCount === 0) {
      throw new AppError(
        `Email campaign failed: 0/${result.totalRecipients} delivered. Please check SMTP connectivity.`,
        502
      );
    }

    if (result.failedCount > 0) {
      ApiResponse.success(
        res,
        result.campaign,
        `Email campaign processed with partial delivery (${result.sentCount}/${result.totalRecipients})`
      );
      return;
    }

    ApiResponse.success(res, result.campaign, 'Email campaign sent successfully');
  });

  listCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminEmailService.listCampaigns(
      req.query.page ? Number(req.query.page) : 1,
      req.query.limit ? Number(req.query.limit) : 20
    );

    ApiResponse.success(res, result, 'Email campaigns retrieved successfully');
  });

  listCampaignDeliveryLogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminEmailService.listCampaignDeliveryLogs(
      req.params.id,
      req.query.page ? Number(req.query.page) : 1,
      req.query.limit ? Number(req.query.limit) : 20
    );

    ApiResponse.success(res, result, 'Email delivery logs retrieved successfully');
  });
}

export const adminEmailController = new AdminEmailController();
