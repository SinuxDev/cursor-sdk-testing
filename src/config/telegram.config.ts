export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  webhookSecret: string;
  allowedChatIds: number[];
  polling: boolean;
}

function parseAllowedChatIds(raw: string | undefined): number[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id));
}

export function getTelegramConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '';
  const allowedChatIds = parseAllowedChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS);
  const polling = process.env.TELEGRAM_POLLING === 'true';

  return {
    enabled: Boolean(botToken),
    botToken,
    webhookSecret,
    allowedChatIds,
    polling,
  };
}

export function assertTelegramConfigured(): TelegramConfig {
  const config = getTelegramConfig();
  if (!config.enabled) {
    throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram bot');
  }
  return config;
}
