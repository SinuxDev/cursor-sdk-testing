import { Request, Response } from 'express';
import { getTelegramConfig } from '../config/telegram.config';
import { asyncHandler } from '../middlewares/asyncHandler';
import { cursorTelegramJobService } from '../services/cursor-telegram-job.service';
import { TelegramUpdate } from '../types/telegram.types';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/AppError';

class TelegramController {
  webhook = asyncHandler(async (req: Request, res: Response) => {
    const config = getTelegramConfig();
    if (!config.enabled) {
      throw new AppError('Telegram bot is not configured', 503);
    }

    const secretParam = req.params.secret;
    if (!config.webhookSecret || secretParam !== config.webhookSecret) {
      throw new AppError('Invalid Telegram webhook secret', 401);
    }

    const update = req.body as TelegramUpdate;
    const message = update.message;
    const text = message?.text?.trim();

    if (message?.chat?.id && text) {
      void cursorTelegramJobService.handleUpdate(message.chat.id, text);
    }

    ApiResponse.success(res, { accepted: true }, 'Update accepted');
  });

  health = asyncHandler(async (_req: Request, res: Response) => {
    const config = getTelegramConfig();
    ApiResponse.success(res, {
      enabled: config.enabled,
      polling: config.polling,
      allowedChatIdsConfigured: config.allowedChatIds.length > 0,
    });
  });
}

export const telegramController = new TelegramController();
