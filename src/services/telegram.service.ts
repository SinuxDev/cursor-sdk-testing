import { assertTelegramConfigured } from '../config/telegram.config';
import { TelegramApiResponse, TelegramUpdate } from '../types/telegram.types';
import { logger } from '../utils/logger';

const TELEGRAM_API = 'https://api.telegram.org';

class TelegramService {
  private get apiBase(): string {
    const { botToken } = assertTelegramConfigured();
    return `${TELEGRAM_API}/bot${botToken}`;
  }

  private async callApi<T>(
    method: string,
    body?: Record<string, string | number | boolean>
  ): Promise<T> {
    const response = await fetch(`${this.apiBase}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json()) as TelegramApiResponse<T>;
    if (!payload.ok) {
      throw new Error(payload.description || `Telegram API ${method} failed`);
    }

    return payload.result as T;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    const chunks = splitTelegramMessage(text);
    for (const chunk of chunks) {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: chunk,
      });
    }
  }

  async getUpdates(offset: number, timeoutSeconds = 25): Promise<TelegramUpdate[]> {
    return this.callApi<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout: timeoutSeconds,
    });
  }

  async deleteWebhook(): Promise<void> {
    await this.callApi<boolean>('deleteWebhook', { drop_pending_updates: false });
    logger.info('Telegram webhook deleted (polling mode)');
  }
}

function splitTelegramMessage(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }
  return chunks;
}

export const telegramService = new TelegramService();
