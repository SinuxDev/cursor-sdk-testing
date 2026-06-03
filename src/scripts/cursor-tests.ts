import 'dotenv/config';
import { getCursorSdkConfig } from '../config/cursor.config';
import { isCursorStartupError, runEventForgeTestsTask } from '../lib/cursor-agent';
import { getWorkspaceChangedPaths } from '../lib/git-changed-files';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const featureSummary = args.join(' ').trim();
  const cwd = getCursorSdkConfig().cwd;
  const changedPaths = getWorkspaceChangedPaths(cwd);

  if (changedPaths.length === 0 && !featureSummary) {
    console.error('Usage: npm run cursor:tests -- ["optional feature summary"]');
    console.error('');
    console.error('Requires local git changes (staged, unstaged, or untracked),');
    console.error('or pass a short summary of what to test.');
    console.error('');
    console.error('Example: npm run cursor:tests -- "RSVP limit on events"');
    console.error('Full pipeline: npm run cursor:ship -- "add RSVP limit"');
    process.exit(1);
  }

  process.stderr.write('EventForge tests task\n');
  if (featureSummary) {
    process.stderr.write(`Context: ${featureSummary}\n`);
  }
  if (changedPaths.length > 0) {
    process.stderr.write(`Changed paths (${changedPaths.length}):\n`);
    for (const path of changedPaths) {
      process.stderr.write(`  ${path}\n`);
    }
  }
  process.stderr.write('\n');

  try {
    const result = await runEventForgeTestsTask({
      featureSummary: featureSummary || undefined,
      changedPaths,
    });
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
