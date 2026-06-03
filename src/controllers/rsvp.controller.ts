import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ManagedRsvpSort, ManagedRsvpTab } from '../repositories/rsvp.repository';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/response';
import { rsvpService } from '../services/rsvp.service';

class RsvpController {
  submitRsvp = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await rsvpService.submitRsvp({
      eventId: req.params.id,
      userId: String(req.user._id),
      formResponses: req.body.formResponses,
    });

    ApiResponse.created(res, result, 'RSVP created');
  });

  listMyRsvps = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const rsvps = await rsvpService.listMyRsvps(String(req.user._id));
    ApiResponse.success(res, rsvps, 'RSVPs retrieved successfully');
  });

  listManagedMyRsvps = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const tab = req.query.tab as ManagedRsvpTab | undefined;
    const search = req.query.search as string | undefined;
    const sort = req.query.sort as ManagedRsvpSort | undefined;

    const page =
      typeof req.query.page === 'number'
        ? req.query.page
        : Number.isFinite(Number(req.query.page))
          ? Number(req.query.page)
          : undefined;
    const limit =
      typeof req.query.limit === 'number'
        ? req.query.limit
        : Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : undefined;

    const result = await rsvpService.listManagedMyRsvps({
      userId: String(req.user._id),
      tab,
      search,
      page,
      limit,
      sort,
    });

    ApiResponse.success(res, result, 'Managed RSVPs retrieved successfully');
  });

  cancelRsvp = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await rsvpService.cancelRsvp(req.params.id, String(req.user._id));
    ApiResponse.success(res, result, 'RSVP cancelled successfully');
  });

  getMyTicket = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const ticket = await rsvpService.getMyTicket(req.params.id, String(req.user._id));
    ApiResponse.success(res, ticket, 'Ticket retrieved successfully');
  });
}

export const rsvpController = new RsvpController();
