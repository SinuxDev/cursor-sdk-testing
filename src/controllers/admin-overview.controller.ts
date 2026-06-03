import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { adminOverviewService } from '../services/admin-overview.service';
import { ApiResponse } from '../utils/response';

class AdminOverviewController {
  getCharts = asyncHandler(async (req: Request, res: Response) => {
    const range =
      req.query.range === '7d' || req.query.range === '90d' || req.query.range === '30d'
        ? req.query.range
        : '30d';

    const charts = await adminOverviewService.getCharts(range);

    ApiResponse.success(res, charts, 'Admin overview charts retrieved successfully');
  });
}

export const adminOverviewController = new AdminOverviewController();
