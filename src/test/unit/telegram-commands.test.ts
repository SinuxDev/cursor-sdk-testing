import {
  getTelegramHelpText,
  parseTelegramInstruction,
} from '../../lib/telegram-commands';

describe('parseTelegramInstruction', () => {
  it('defaults plain text to ship', () => {
    const parsed = parseTelegramInstruction('add RSVP limit');
    expect(parsed).toEqual({
      command: 'ship',
      args: 'add RSVP limit',
      noPr: false,
    });
  });

  it('parses ship with no-pr flag', () => {
    const parsed = parseTelegramInstruction('/ship --no-pr add demo price');
    expect(parsed).toEqual({
      command: 'ship',
      args: 'add demo price',
      noPr: true,
    });
  });

  it('parses bot username suffix', () => {
    const parsed = parseTelegramInstruction('/task@EventForgeBot fix auth bug');
    expect(parsed).toEqual({
      command: 'task',
      args: 'fix auth bug',
      noPr: false,
    });
  });

  it('returns help for empty input', () => {
    expect(parseTelegramInstruction('')).toEqual({
      command: 'help',
      args: '',
      noPr: false,
    });
    expect(parseTelegramInstruction('   ')).toEqual({
      command: 'help',
      args: '',
      noPr: false,
    });
  });

  it('maps /start and unknown slash commands to help', () => {
    expect(parseTelegramInstruction('/start').command).toBe('help');
    expect(parseTelegramInstruction('/unknown').command).toBe('help');
  });

  it('parses command aliases', () => {
    expect(parseTelegramInstruction('/test').command).toBe('tests');
    expect(parseTelegramInstruction('/tests RSVP coverage').args).toBe('RSVP coverage');
    expect(parseTelegramInstruction('/commit --pr feature').command).toBe('commit');
    expect(parseTelegramInstruction('/pr').command).toBe('pr');
    expect(parseTelegramInstruction('/status').command).toBe('status');
  });
});

describe('getTelegramHelpText', () => {
  it('documents core bot commands', () => {
    const help = getTelegramHelpText();
    expect(help).toContain('EventForge Cursor bot');
    expect(help).toContain('/ship');
    expect(help).toContain('/task');
    expect(help).toContain('/tests');
    expect(help).toContain('/status');
    expect(help).toContain('/help');
  });
});
