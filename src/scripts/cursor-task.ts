import 'dotenv/config';
import {
  isCursorStartupError,
  runEventForgeShip,
  runEventForgeTask,
  runEventForgeTaskWithTests,
} from '../lib/cursor-agent';
import { printLatestCommit, printOpenPullRequest } from '../lib/git-changed-files';

const PIPELINE_FLAGS = new Set(['--with-tests', '--commit', '--ship', '--no-pr']);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const ship =
    args.includes('--ship') ||
    (args.includes('--with-tests') && args.includes('--commit'));
  const withTests = args.includes('--with-tests') || ship;
  const openPr = ship && !args.includes('--no-pr');
  const task = args.filter((arg) => !PIPELINE_FLAGS.has(arg)).join(' ').trim();

  if (!task) {
    console.error('Usage: npm run cursor:task -- "<short task>" [options]');
    console.error('Example: npm run cursor:task -- "add RSVP limit to events"');
    console.error('         npm run cursor:task -- --with-tests "add RSVP limit"');
    console.error('         npm run cursor:ship -- "add RSVP limit"');
    console.error('         npm run cursor:task -- --with-tests --commit "add RSVP limit"');
    console.error('Skip PR: npm run cursor:ship -- --no-pr "your task"');
    console.error('After manual edits: npm run cursor:tests | npm run cursor:commit | npm run cursor:pr');
    process.exit(1);
  }

  process.stderr.write(`EventForge task: ${task}\n`);
  if (ship) {
    process.stderr.write(
      openPr
        ? '(implementation → tests → commit → pull request)\n'
        : '(implementation → tests → commit)\n'
    );
  } else if (withTests) {
    process.stderr.write('(implementation + tests in one session)\n');
  }
  process.stderr.write('\n');

  try {
    if (ship) {
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
      return;
    }

    if (withTests) {
      const { implementation, tests } = await runEventForgeTaskWithTests(task);
      process.stdout.write('\n');
      process.stderr.write(
        `\nDone — implementation: ${implementation.status}, tests: ${tests.status}\n`
      );
      if (implementation.status === 'error' || tests.status === 'error') {
        process.exit(2);
      }
      return;
    }

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
