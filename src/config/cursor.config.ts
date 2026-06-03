import path from 'path';
import { getRepositoryDefaultBranch } from '../lib/git-repo-branches';

/** Repository root used as the local agent working directory. */
export const CURSOR_WORKSPACE_CWD = path.resolve(__dirname, '../..');

export interface CursorSdkConfig {
  apiKey: string;
  model: string;
  cwd: string;
  prBaseBranch: string;
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

  return {
    apiKey,
    model: process.env.CURSOR_MODEL?.trim() || 'composer-2.5',
    cwd,
    prBaseBranch,
  };
}
