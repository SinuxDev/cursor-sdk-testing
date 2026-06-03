import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { appealRequestService } from '../services/appeal-request.service';
import { ApiResponse } from '../utils/response';

class AppealRequestController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const createdAppeal = await appealRequestService.create(req.body);

    ApiResponse.created(
      res,
      {
        referenceCode: createdAppeal.referenceCode,
        status: createdAppeal.status,
        createdAt: createdAppeal.createdAt,
      },
      'Appeal submitted successfully'
    );
  });

  listAdminAppeals = asyncHandler(async (req: Request, res: Response) => {
    const result = await appealRequestService.listAppeals({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status:
        req.query.status === 'submitted' ||
        req.query.status === 'in_review' ||
        req.query.status === 'resolved' ||
        req.query.status === 'rejected'
          ? req.query.status
          : undefined,
      issueType:
        req.query.issueType === 'account_suspension' ||
        req.query.issueType === 'policy_warning' ||
        req.query.issueType === 'payment_restriction' ||
        req.query.issueType === 'content_violation' ||
        req.query.issueType === 'other'
          ? req.query.issueType
          : undefined,
      source:
        req.query.source === 'public-website' || req.query.source === 'authenticated-website'
          ? req.query.source
          : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });

    ApiResponse.success(res, result, 'Appeal requests retrieved successfully');
  });

  updateAdminAppealStatus = asyncHandler(async (req: Request, res: Response) => {
    const updatedAppeal = await appealRequestService.updateStatus({
      appealId: req.params.id,
      status: req.body.status,
    });

    ApiResponse.success(res, updatedAppeal, 'Appeal request status updated successfully');
  });
}

export const appealRequestController = new AppealRequestController();
