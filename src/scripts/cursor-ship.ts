import 'dotenv/config';
import {
  formatEventForgeShipSummary,
  isCursorStartupError,
  runEventForgeShip,
} from '../lib/cursor-agent';
import { getCursorSdkConfig } from '../config/cursor.config';
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
    console.error('Cloud (default on server): VM clone + auto PR. Local: git/gh on this machine.');
    console.error('Requires: CURSOR_API_KEY, CURSOR_GITHUB_REPO_URL when using cloud.');
    process.exit(1);
  }

  const { prBaseBranch, runtime, githubRepoUrl } = getCursorSdkConfig();

  process.stderr.write(`EventForge ship: ${task}\n`);
  process.stderr.write(`Runtime: ${runtime}${runtime === 'cloud' ? ` (${githubRepoUrl})` : ''}\n`);
  if (openPr) {
    process.stderr.write(
      runtime === 'cloud'
        ? `(cloud: implementation → tests → finalize + auto PR → base: ${prBaseBranch})\n\n`
        : `(implementation → tests → commit → pull request → base: ${prBaseBranch})\n\n`
    );
  } else {
    process.stderr.write('(implementation → tests → commit)\n\n');
  }

  try {
    const result = await runEventForgeShip(task, { openPr });
    process.stdout.write('\n');
    process.stderr.write(`\nDone\n${formatEventForgeShipSummary(result, openPr)}\n`);
    if (runtime === 'local') {
      printLatestCommit();
      printOpenPullRequest();
    }
    const { implementation, tests, commit, pullRequest } = result;
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
