import { execSync } from 'child_process';

function runGitOneline(cwd: string, command: string): string | null {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output || null;
  } catch {
    return null;
  }
}

function localBranchExists(cwd: string, branch: string): boolean {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branch}`, {
      cwd,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the PR base branch from origin/HEAD, GitHub CLI, or local branches.
 */
export function getRepositoryDefaultBranch(cwd: string): string {
  const originHead = runGitOneline(cwd, 'git symbolic-ref --short refs/remotes/origin/HEAD');
  if (originHead?.startsWith('origin/')) {
    return originHead.slice('origin/'.length);
  }

  const fromGh = runGitOneline(
    cwd,
    'gh repo view --json defaultBranchRef -q .defaultBranchRef.name'
  );
  if (fromGh) {
    return fromGh;
  }

  if (localBranchExists(cwd, 'main')) {
    return 'main';
  }
  if (localBranchExists(cwd, 'master')) {
    return 'master';
  }

  return 'main';
}
