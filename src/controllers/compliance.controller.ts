import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { complianceService } from '../services/compliance.service';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/AppError';

class ComplianceController {
  listCases = asyncHandler(async (req: Request, res: Response) => {
    const result = await complianceService.listCases({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status:
        req.query.status === 'open' ||
        req.query.status === 'in_review' ||
        req.query.status === 'actioned' ||
        req.query.status === 'resolved'
          ? req.query.status
          : undefined,
      severity:
        req.query.severity === 'low' ||
        req.query.severity === 'medium' ||
        req.query.severity === 'high' ||
        req.query.severity === 'critical'
          ? req.query.severity
          : undefined,
    });

    ApiResponse.success(res, result, 'Compliance cases retrieved successfully');
  });

  getCaseById = asyncHandler(async (req: Request, res: Response) => {
    const complianceCase = await complianceService.getCaseById(req.params.id);
    ApiResponse.success(res, complianceCase, 'Compliance case retrieved successfully');
  });

  getRiskOverview = asyncHandler(async (_req: Request, res: Response) => {
    const result = await complianceService.getRiskOverview();
    ApiResponse.success(res, result, 'Risk overview retrieved successfully');
  });

  createCase = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const createdCase = await complianceService.createCase({
      actorUserId: String(req.user._id),
      name: req.body.name,
      survey: req.body.survey,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      severity: req.body.severity,
      linkedUserId: req.body.linkedUserId,
      linkedEventId: req.body.linkedEventId,
      assignedAdminId: req.body.assignedAdminId,
      dueAt: req.body.dueAt,
    });

    ApiResponse.created(res, createdCase, 'Compliance case created successfully');
  });

  updateCase = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const updatedCase = await complianceService.updateCase({
      actorUserId: String(req.user._id),
      caseId: req.params.id,
      name: req.body.name,
      survey: Object.prototype.hasOwnProperty.call(req.body, 'survey')
        ? req.body.survey
        : undefined,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      severity: req.body.severity,
      linkedUserId: Object.prototype.hasOwnProperty.call(req.body, 'linkedUserId')
        ? req.body.linkedUserId
        : undefined,
      linkedEventId: Object.prototype.hasOwnProperty.call(req.body, 'linkedEventId')
        ? req.body.linkedEventId
        : undefined,
      assignedAdminId: Object.prototype.hasOwnProperty.call(req.body, 'assignedAdminId')
        ? req.body.assignedAdminId
        : undefined,
      dueAt: Object.prototype.hasOwnProperty.call(req.body, 'dueAt') ? req.body.dueAt : undefined,
      reason: req.body.reason,
    });

    ApiResponse.success(res, updatedCase, 'Compliance case updated successfully');
  });

  updateCaseStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const updatedCase = await complianceService.updateCaseStatus({
      actorUserId: String(req.user._id),
      caseId: req.params.id,
      status: req.body.status,
      resolutionNote: req.body.resolutionNote,
      reason: req.body.reason,
    });

    ApiResponse.success(res, updatedCase, 'Compliance case status updated successfully');
  });
}

export const complianceController = new ComplianceController();
