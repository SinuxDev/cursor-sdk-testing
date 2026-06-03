import 'dotenv/config';
import { isCursorStartupError, runEventForgeShip } from '../lib/cursor-agent';
import { printLatestCommit, printOpenPullRequest } from '../lib/git-changed-files';

const SHIP_FLAGS = new Set(['--no-pr']);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const openPr = !args.includes('--no-pr');
  const task = args.filter((arg) => !SHIP_FLAGS.has(arg)).join(' ').trim();

  if (!task) {
    console.error('Usage: npm run cursor:ship -- "<feature task>" [--no-pr]');
    console.error('Example: npm run cursor:ship -- "add RSVP limit to events"');
    console.error('');
    console.error('Runs: implementation → tests → commit → GitHub PR (gh).');
    console.error('Requires: gh auth login, git remote, and CURSOR_API_KEY.');
    process.exit(1);
  }

  process.stderr.write(`EventForge ship: ${task}\n`);
  process.stderr.write(
    openPr
      ? '(implementation → tests → commit → pull request)\n\n'
      : '(implementation → tests → commit)\n\n'
  );

  try {
    const { implementation, tests, commit, pullRequest } = await runEventForgeShip(task, {
      openPr,
    });
    process.stdout.write('\n');
    const prStatus = pullRequest ? `, pr: ${pullRequest.status}` : '';
    process.stderr.write(
      `\nDone — implementation: ${implementation.status}, tests: ${tests.status}, commit: ${commit.status}${prStatus}\n`
    );
    printLatestCommit();
    printOpenPullRequest();
    if (
      implementation.status === 'error' ||
      tests.status === 'error' ||
      commit.status === 'error' ||
      pullRequest?.status === 'error'
    ) {
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
