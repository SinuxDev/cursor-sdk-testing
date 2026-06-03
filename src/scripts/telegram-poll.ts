import 'dotenv/config';
import { assertTelegramConfigured } from '../config/telegram.config';
import { cursorTelegramJobService } from '../services/cursor-telegram-job.service';
import { telegramService } from '../services/telegram.service';
import { TelegramUpdate } from '../types/telegram.types';
import { logger } from '../utils/logger';

async function pollForever(): Promise<void> {
  assertTelegramConfigured();
  await telegramService.deleteWebhook();

  let offset = 0;
  logger.info('Telegram long polling started');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const updates = await telegramService.getUpdates(offset);
    for (const update of updates) {
      await handleUpdate(update);
      offset = update.update_id + 1;
    }
  }
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!chatId || !text) {
    return;
  }

  try {
    await cursorTelegramJobService.handleUpdate(chatId, text);
  } catch (error) {
    logger.error('Failed to handle Telegram update', error);
    await telegramService.sendMessage(
      chatId,
      `Bot error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

void pollForever().catch((error) => {
  logger.error('Telegram polling crashed', error);
  process.exit(1);
});
