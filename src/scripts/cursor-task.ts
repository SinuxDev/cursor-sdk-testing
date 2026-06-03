import 'dotenv/config';
import { isCursorStartupError, runEventForgeTask } from '../lib/cursor-agent';

async function main(): Promise<void> {
  const task = process.argv.slice(2).join(' ').trim();

  if (!task) {
    console.error('Usage: npm run cursor:task -- "<short task>"');
    console.error('Example: npm run cursor:task -- "add RSVP limit to events"');
    process.exit(1);
  }

  process.stderr.write(`EventForge task: ${task}\n\n`);

  try {
    const result = await runEventForgeTask(task);
    process.stdout.write('\n');
    process.stderr.write(`\nDone (${result.status})\n`);
    if (result.status === 'error') {
      process.exit(2);
    }
  } catch (error) {
    if (isCursorStartupError(error)) {
      process.stderr.write(
        `Startup failed: ${error.message} (retryable=${error.isRetryable})\n`
      );
      process.exit(1);
    }
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  }
}

void main();
