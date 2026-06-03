import 'dotenv/config';
import { isCursorStartupError, runEventForgePullRequestTask } from '../lib/cursor-agent';
import { printOpenPullRequest } from '../lib/git-changed-files';

async function main(): Promise<void> {
  const summary = process.argv.slice(2).join(' ').trim();

  process.stderr.write('EventForge pull request\n');
  if (summary) {
    process.stderr.write(`Context: ${summary}\n`);
  }
  process.stderr.write('\n');

  try {
    const result = await runEventForgePullRequestTask({
      featureSummary: summary || undefined,
    });
    process.stdout.write('\n');
    process.stderr.write(`\nDone (${result.status})\n`);
    printOpenPullRequest();
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
