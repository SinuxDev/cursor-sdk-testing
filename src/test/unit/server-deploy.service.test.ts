import { spawn } from 'child_process';
import { schedulePm2Restart } from '../../services/server-deploy.service';

jest.mock('child_process', () => {
  const actual = jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: jest.fn(),
  };
});

const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('schedulePm2Restart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSpawn.mockReturnValue({ unref: jest.fn() } as unknown as ReturnType<typeof spawn>);
  });

  it('spawns a delayed pm2 restart in a detached shell', () => {
    schedulePm2Restart('telegram-bot', 2000);

    expect(mockedSpawn).toHaveBeenCalledWith(
      'bash',
      ['-c', 'sleep 2 && pm2 restart telegram-bot'],
      { detached: true, stdio: 'ignore' }
    );
  });
});
