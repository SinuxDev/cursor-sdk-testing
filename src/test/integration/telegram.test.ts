import request from 'supertest';
import app from '../../app';
import { cursorTelegramJobService } from '../../services/cursor-telegram-job.service';
import './setup';

jest.mock('../../services/cursor-telegram-job.service', () => ({
  cursorTelegramJobService: {
    handleUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedHandleUpdate = cursorTelegramJobService.handleUpdate as jest.MockedFunction<
  typeof cursorTelegramJobService.handleUpdate
>;

describe('Telegram API integration', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    jest.clearAllMocks();
  });

  describe('GET /api/v1/telegram/health', () => {
    it('returns bot status when Telegram is not configured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const response = await request(app).get('/api/v1/telegram/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          enabled: false,
          polling: false,
          allowedChatIdsConfigured: false,
        },
      });
    });

    it('returns enabled status when bot token is configured', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'integration-test-token';
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1,2';
      process.env.TELEGRAM_POLLING = 'true';

      const response = await request(app).get('/api/v1/telegram/health').expect(200);

      expect(response.body.data).toMatchObject({
        enabled: true,
        polling: true,
        allowedChatIdsConfigured: true,
      });
    });
  });

  describe('POST /api/v1/telegram/webhook/:secret', () => {
    it('returns 503 when Telegram bot is not configured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const response = await request(app)
        .post('/api/v1/telegram/webhook/any-secret')
        .send({ message: { chat: { id: 1 }, text: '/help' } })
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Telegram bot is not configured',
      });
      expect(mockedHandleUpdate).not.toHaveBeenCalled();
    });

    it('returns 401 when webhook secret does not match', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'integration-test-token';
      process.env.TELEGRAM_WEBHOOK_SECRET = 'expected-secret';

      const response = await request(app)
        .post('/api/v1/telegram/webhook/wrong-secret')
        .send({ message: { chat: { id: 1 }, text: '/help' } })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid Telegram webhook secret',
      });
      expect(mockedHandleUpdate).not.toHaveBeenCalled();
    });

    it('accepts update and queues handling when secret matches', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'integration-test-token';
      process.env.TELEGRAM_WEBHOOK_SECRET = 'expected-secret';

      const update = {
        update_id: 1,
        message: {
          message_id: 10,
          chat: { id: 424242, type: 'private' },
          text: '/ship add README note',
        },
      };

      const response = await request(app)
        .post('/api/v1/telegram/webhook/expected-secret')
        .send(update)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Update accepted',
        data: { accepted: true },
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockedHandleUpdate).toHaveBeenCalledWith(424242, '/ship add README note');
    });

    it('accepts webhook without invoking handler when message has no text', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'integration-test-token';
      process.env.TELEGRAM_WEBHOOK_SECRET = 'expected-secret';

      await request(app)
        .post('/api/v1/telegram/webhook/expected-secret')
        .send({ update_id: 2, message: { chat: { id: 1 }, text: '   ' } })
        .expect(200);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockedHandleUpdate).not.toHaveBeenCalled();
    });
  });
});
