import {
  assertTelegramConfigured,
  getTelegramConfig,
} from '../../config/telegram.config';

describe('getTelegramConfig', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('reports disabled when bot token is missing', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    expect(getTelegramConfig()).toMatchObject({
      enabled: false,
      botToken: '',
      polling: false,
      allowedChatIds: [],
    });
  });

  it('parses allowed chat ids and polling flag', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-123';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-abc';
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = ' 42 , invalid , 99 ';
    process.env.TELEGRAM_POLLING = 'true';

    expect(getTelegramConfig()).toEqual({
      enabled: true,
      botToken: 'token-123',
      webhookSecret: 'secret-abc',
      allowedChatIds: [42, 99],
      polling: true,
    });
  });
});

describe('assertTelegramConfigured', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('throws when Telegram is not configured', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    expect(() => assertTelegramConfigured()).toThrow(
      'TELEGRAM_BOT_TOKEN is required for Telegram bot'
    );
  });

  it('returns config when bot token is set', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'configured-token';

    expect(assertTelegramConfigured().botToken).toBe('configured-token');
  });
});
