import { cursorTelegramJobService } from '../../services/cursor-telegram-job.service';
import { telegramService } from '../../services/telegram.service';
import { getTelegramHelpText } from '../../lib/telegram-commands';

jest.mock('../../services/telegram.service', () => ({
  telegramService: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../lib/cursor-agent', () => ({
  formatEventForgeShipSummary: jest.fn().mockReturnValue('ship complete'),
  isCloudRuntime: jest.fn().mockReturnValue(false),
  isCursorStartupError: jest.fn().mockReturnValue(false),
  runEventForgeShip: jest.fn(
    () =>
      new Promise<{ status: string }>(() => {
        /* never resolves — keeps job in running state */
      })
  ),
  runEventForgeTask: jest.fn(),
  runEventForgeTestsTask: jest.fn(),
  runEventForgeTestsAndCommit: jest.fn(),
  runEventForgeCommitTask: jest.fn(),
  runEventForgePullRequestTask: jest.fn(),
}));

jest.mock('../../config/cursor.config', () => ({
  getCursorSdkConfig: jest.fn(() => ({
    apiKey: 'test-key',
    model: 'test-model',
    cwd: '/tmp',
    prBaseBranch: 'master',
    runtime: 'local',
    githubRepoUrl: '',
  })),
}));

const mockedSendMessage = telegramService.sendMessage as jest.MockedFunction<
  typeof telegramService.sendMessage
>;

describe('cursorTelegramJobService', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  describe('isChatAllowed', () => {
    it('allows all chats when allowlist is empty', () => {
      expect(cursorTelegramJobService.isChatAllowed(1001)).toBe(true);
    });

    it('allows only listed chat ids when allowlist is configured', () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '1001,2002';

      expect(cursorTelegramJobService.isChatAllowed(1001)).toBe(true);
      expect(cursorTelegramJobService.isChatAllowed(3003)).toBe(false);
    });
  });

  describe('handleUpdate', () => {
    it('rejects unauthorized chat', async () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '4242';

      await cursorTelegramJobService.handleUpdate(1111, '/help');

      expect(mockedSendMessage).toHaveBeenCalledWith(
        1111,
        'This chat is not authorized. Set TELEGRAM_ALLOWED_CHAT_IDS on the server.'
      );
    });

    it('sends help text for /help', async () => {
      await cursorTelegramJobService.handleUpdate(5001, '/help');

      expect(mockedSendMessage).toHaveBeenCalledWith(5001, getTelegramHelpText());
    });

    it('reports no active job for /status', async () => {
      await cursorTelegramJobService.handleUpdate(5002, '/status');

      expect(mockedSendMessage).toHaveBeenCalledWith(5002, 'No active job for this chat.');
    });

    it('requires instruction text for /ship without args', async () => {
      await cursorTelegramJobService.handleUpdate(5003, '/ship');

      expect(mockedSendMessage).toHaveBeenCalledWith(
        5003,
        expect.stringContaining('Missing instruction text')
      );
    });

    it('blocks a second job while one is running', async () => {
      const chatId = 9001;

      await cursorTelegramJobService.handleUpdate(chatId, '/ship add RSVP limit');
      await cursorTelegramJobService.handleUpdate(chatId, '/ship another task');

      expect(mockedSendMessage).toHaveBeenCalledWith(
        chatId,
        'A Cursor job is already running for this chat. Send /status or wait for it to finish.'
      );
    });
  });
});
