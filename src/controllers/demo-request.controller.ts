import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { demoRequestService } from '../services/demo-request.service';
import { ApiResponse } from '../utils/response';

class DemoRequestController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const createdDemoRequest = await demoRequestService.create(req.body);

    ApiResponse.created(res, createdDemoRequest, 'Demo request submitted successfully');
  });
}

export const demoRequestController = new DemoRequestController();
