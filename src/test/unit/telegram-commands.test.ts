import { parseTelegramInstruction } from '../../lib/telegram-commands';

describe('parseTelegramInstruction', () => {
  it('defaults plain text to ship', () => {
    const parsed = parseTelegramInstruction('add RSVP limit');
    expect(parsed.command).toBe('ship');
    expect(parsed.args).toBe('add RSVP limit');
    expect(parsed.noPr).toBe(false);
  });

  it('parses ship with no-pr flag', () => {
    const parsed = parseTelegramInstruction('/ship --no-pr add demo price');
    expect(parsed.command).toBe('ship');
    expect(parsed.args).toBe('add demo price');
    expect(parsed.noPr).toBe(true);
  });

  it('parses bot username suffix', () => {
    const parsed = parseTelegramInstruction('/task@EventForgeBot fix auth bug');
    expect(parsed.command).toBe('task');
    expect(parsed.args).toBe('fix auth bug');
  });
});
