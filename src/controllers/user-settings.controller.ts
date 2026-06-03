import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/response';
import { userSettingsService } from '../services/user-settings.service';

class UserSettingsController {
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.getSettingsSnapshot(String(req.user._id));

    ApiResponse.success(res, result, 'User settings retrieved successfully');
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.updateProfile({
      userId: String(req.user._id),
      name: req.body.name,
      avatar: req.body.avatar,
    });

    ApiResponse.success(res, result, 'Profile updated successfully');
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    await userSettingsService.changePassword({
      userId: String(req.user._id),
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });

    ApiResponse.success(res, null, 'Password changed successfully');
  });

  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.updatePreferences({
      userId: String(req.user._id),
      preferences: req.body,
    });

    ApiResponse.success(res, result, 'Preferences updated successfully');
  });

  updateAttendeeSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.updateAttendeeSettings({
      userId: String(req.user._id),
      settings: req.body,
    });

    ApiResponse.success(res, result, 'Attendee settings updated successfully');
  });

  updateOrganizerSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.updateOrganizerSettings({
      userId: String(req.user._id),
      settings: req.body,
    });

    ApiResponse.success(res, result, 'Organizer settings updated successfully');
  });

  updateAdminSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await userSettingsService.updateAdminSettings({
      userId: String(req.user._id),
      settings: req.body,
    });

    ApiResponse.success(res, result, 'Admin settings updated successfully');
  });
}

export const userSettingsController = new UserSettingsController();
