import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { demoRequestAdminService } from '../services/demo-request-admin.service';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/AppError';

class DemoRequestAdminController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await demoRequestAdminService.listDemoRequests({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
      priority:
        typeof req.query.priority === 'string'
          ? (req.query.priority as 'low' | 'medium' | 'high')
          : undefined,
      ownerAdminId: typeof req.query.ownerAdminId === 'string' ? req.query.ownerAdminId : undefined,
      source:
        req.query.source === 'public-website' || req.query.source === 'authenticated-website'
          ? req.query.source
          : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      sla:
        req.query.sla === 'overdue' || req.query.sla === 'on_time' || req.query.sla === 'all'
          ? req.query.sla
          : undefined,
    });

    ApiResponse.success(res, result, 'Demo requests retrieved successfully');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const request = await demoRequestAdminService.getDemoRequestById(req.params.id);
    ApiResponse.success(res, request, 'Demo request retrieved successfully');
  });

  assign = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const request = await demoRequestAdminService.assignOwner({
      actorUserId: String(req.user._id),
      demoRequestId: req.params.id,
      ownerAdminId: req.body.ownerAdminId,
      reason: String(req.body.reason),
    });

    ApiResponse.success(res, request, 'Demo request owner assigned successfully');
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const request = await demoRequestAdminService.updateStatus({
      actorUserId: String(req.user._id),
      demoRequestId: req.params.id,
      status: req.body.status,
      reason: String(req.body.reason),
      qualificationNotes: req.body.qualificationNotes,
      scheduledAt: req.body.scheduledAt,
      nextActionAt: req.body.nextActionAt,
    });

    ApiResponse.success(res, request, 'Demo request status updated successfully');
  });

  updateFollowUp = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const request = await demoRequestAdminService.updateFollowUp({
      actorUserId: String(req.user._id),
      demoRequestId: req.params.id,
      reason: String(req.body.reason),
      lastContactAt: req.body.lastContactAt,
      nextActionAt: req.body.nextActionAt,
      qualificationNotes: req.body.qualificationNotes,
      priority: req.body.priority,
    });

    ApiResponse.success(res, request, 'Demo request follow-up updated successfully');
  });

  sendReply = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const request = await demoRequestAdminService.sendReply({
      actorUserId: String(req.user._id),
      demoRequestId: req.params.id,
      templateKey: req.body.templateKey,
      reason: String(req.body.reason),
      customMessage: req.body.customMessage,
      scheduleLink: req.body.scheduleLink,
    });

    ApiResponse.success(res, request, 'Demo request reply sent successfully');
  });

  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const range = req.query.range === '7d' || req.query.range === '90d' ? req.query.range : '30d';
    const analytics = await demoRequestAdminService.getAnalytics(range);
    ApiResponse.success(res, analytics, 'Demo request analytics retrieved successfully');
  });
}

export const demoRequestAdminController = new DemoRequestAdminController();
