import { execSync } from 'child_process';
import { getCursorSdkConfig } from '../config/cursor.config';

function runGit(cwd: string, command: string): string[] {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!output) {
      return [];
    }
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Paths changed in the working tree (staged, unstaged, and untracked). */
export function getWorkspaceChangedPaths(cwd: string): string[] {
  const paths = new Set<string>();
  for (const file of [
    ...runGit(cwd, 'git diff --name-only'),
    ...runGit(cwd, 'git diff --cached --name-only'),
    ...runGit(cwd, 'git ls-files --others --exclude-standard'),
  ]) {
    paths.add(file);
  }
  return [...paths].sort();
}

export function getLatestCommitOneline(cwd?: string): string | null {
  const root = cwd ?? getCursorSdkConfig().cwd;
  try {
    return execSync('git log -1 --oneline', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function printLatestCommit(cwd?: string): void {
  const line = getLatestCommitOneline(cwd);
  if (line) {
    process.stderr.write(`Latest commit: ${line}\n`);
  }
}

export function getCurrentPullRequestUrl(cwd?: string): string | null {
  const root = cwd ?? getCursorSdkConfig().cwd;
  try {
    const url = execSync('gh pr view --json url -q .url', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return url || null;
  } catch {
    return null;
  }
}

export function printOpenPullRequest(cwd?: string): void {
  const url = getCurrentPullRequestUrl(cwd);
  if (url) {
    process.stderr.write(`Pull request: ${url}\n`);
  }
}
