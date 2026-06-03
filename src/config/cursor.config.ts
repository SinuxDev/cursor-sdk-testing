import path from 'path';
import { getRepositoryDefaultBranch } from '../lib/git-repo-branches';

/** Repository root used as the local agent working directory. */
export const CURSOR_WORKSPACE_CWD = path.resolve(__dirname, '../..');

export type CursorRuntime = 'local' | 'cloud';

export interface CursorSdkConfig {
  apiKey: string;
  model: string;
  cwd: string;
  prBaseBranch: string;
  runtime: CursorRuntime;
  githubRepoUrl: string;
}

function resolveCursorRuntime(cwd: string): CursorRuntime {
  const explicit = process.env.CURSOR_RUNTIME?.trim().toLowerCase();
  if (explicit === 'cloud' || explicit === 'local') {
    return explicit;
  }
  if (process.env.CURSOR_GITHUB_REPO_URL?.trim()) {
    return 'cloud';
  }
  return 'local';
}

export function getCursorSdkConfig(): CursorSdkConfig {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'CURSOR_API_KEY is required. Create a key at https://cursor.com/dashboard/integrations'
    );
  }

  const cwd = process.env.CURSOR_WORKSPACE_CWD?.trim() || CURSOR_WORKSPACE_CWD;
  const prBaseBranch =
    process.env.CURSOR_PR_BASE_BRANCH?.trim() || getRepositoryDefaultBranch(cwd);
  const runtime = resolveCursorRuntime(cwd);
  const githubRepoUrl = process.env.CURSOR_GITHUB_REPO_URL?.trim() || '';

  if (runtime === 'cloud' && !githubRepoUrl) {
    throw new Error(
      'CURSOR_GITHUB_REPO_URL is required when CURSOR_RUNTIME=cloud (e.g. https://github.com/org/repo)'
    );
  }

  return {
    apiKey,
    model: process.env.CURSOR_MODEL?.trim() || 'composer-2.5',
    cwd,
    prBaseBranch,
    runtime,
    githubRepoUrl,
  };
}
