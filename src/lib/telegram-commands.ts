export type TelegramCursorCommand =
  | 'help'
  | 'ship'
  | 'task'
  | 'tests'
  | 'commit'
  | 'pr'
  | 'status';

export interface ParsedTelegramInstruction {
  command: TelegramCursorCommand;
  args: string;
  noPr: boolean;
}

const COMMAND_ALIASES: Record<string, TelegramCursorCommand> = {
  help: 'help',
  start: 'help',
  ship: 'ship',
  task: 'task',
  tests: 'tests',
  test: 'tests',
  commit: 'commit',
  pr: 'pr',
  status: 'status',
};

export function parseTelegramInstruction(text: string): ParsedTelegramInstruction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { command: 'help', args: '', noPr: false };
  }

  const commandMatch = trimmed.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (commandMatch) {
    const alias = commandMatch[1].toLowerCase();
    const command = COMMAND_ALIASES[alias] ?? 'help';
    const rawArgs = (commandMatch[2] || '').trim();
    const noPr = /--no-pr\b/.test(rawArgs);
    const args = rawArgs.replace(/--no-pr\b/g, '').trim();
    return { command, args, noPr };
  }

  return { command: 'ship', args: trimmed, noPr: false };
}

export function getTelegramHelpText(): string {
  return [
    'EventForge Cursor bot',
    '(Uses CURSOR_RUNTIME: cloud = VM + GitHub PR, local = server repo)',
    '',
    'Send a task (plain text defaults to /ship):',
    '/ship add RSVP limit to events',
    '/ship --no-pr fix demo request validation',
    '/task implement health check endpoint',
    '/tests',
    '/tests RSVP limit coverage',
    '/commit',
    '/commit --pr RSVP limit feature',
    '/pr',
    '/status',
    '/help',
  ].join('\n');
}
