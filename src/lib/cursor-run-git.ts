import type { RunResult } from '@cursor/sdk';

export function extractPrUrlFromRunResults(...results: RunResult[]): string | undefined {
  for (const result of results) {
    for (const branch of result.git?.branches ?? []) {
      if (branch.prUrl) {
        return branch.prUrl;
      }
    }
  }
  return undefined;
}

export function formatRunGitSummary(...results: RunResult[]): string {
  const prUrl = extractPrUrlFromRunResults(...results);
  if (!prUrl) {
    return '';
  }
  return `pr: ${prUrl}`;
}
