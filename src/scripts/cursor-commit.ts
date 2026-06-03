import 'dotenv/config';
import { getCursorSdkConfig } from '../config/cursor.config';
import {
  isCursorStartupError,
  runEventForgeCommitTask,
  runEventForgePullRequestTask,
  runEventForgeTestsAndCommit,
} from '../lib/cursor-agent';
import {
  getWorkspaceChangedPaths,
  printLatestCommit,
  printOpenPullRequest,
} from '../lib/git-changed-files';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const testsOnly = args.includes('--skip-tests');
  const openPr = args.includes('--pr');
  const summary = args
    .filter((arg) => arg !== '--skip-tests' && arg !== '--pr')
    .join(' ')
    .trim();
  const cwd = getCursorSdkConfig().cwd;
  const changedPaths = getWorkspaceChangedPaths(cwd);

  if (changedPaths.length === 0) {
    console.error('No git changes to commit. Make your edits first.');
    process.exit(1);
  }

  process.stderr.write('EventForge commit\n');
  if (summary) {
    process.stderr.write(`Context: ${summary}\n`);
  }
  process.stderr.write(`Changed paths (${changedPaths.length})\n\n`);

  try {
    if (testsOnly) {
      const result = await runEventForgeCommitTask({
        featureSummary: summary || undefined,
        changedPaths,
      });
      if (result.status === 'error') {
        process.exit(2);
      }
      if (openPr) {
        const pr = await runEventForgePullRequestTask({
          featureSummary: summary || undefined,
        });
        if (pr.status === 'error') {
          process.exit(2);
        }
      }
    } else {
      const { tests, commit, pullRequest } = await runEventForgeTestsAndCommit({
        featureSummary: summary || undefined,
        changedPaths,
        openPr,
      });
      const prStatus = pullRequest ? `, pr: ${pullRequest.status}` : '';
      process.stderr.write(
        `\nDone — tests: ${tests.status}, commit: ${commit.status}${prStatus}\n`
      );
      if (
        tests.status === 'error' ||
        commit.status === 'error' ||
        pullRequest?.status === 'error'
      ) {
        process.exit(2);
      }
    }

    process.stdout.write('\n');
    printLatestCommit();
    if (openPr) {
      printOpenPullRequest();
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
