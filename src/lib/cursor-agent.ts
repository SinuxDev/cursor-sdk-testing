import {
  Agent,
  CursorAgentError,
  type AgentOptions,
  type Run,
  type RunResult,
  type SDKAgent,
  type SDKMessage,
  type SettingSource,
} from '@cursor/sdk';
import { getCursorSdkConfig, type CursorRuntime } from '../config/cursor.config';
import { extractPrUrlFromRunResults } from './cursor-run-git';
import { getWorkspaceChangedPaths } from './git-changed-files';

/** Loads `.cursor/rules`, skills, hooks, MCP, and agents from the repo. */
export const EVENT_FORGE_PROJECT_SETTING_SOURCES: SettingSource[] = ['project'];

export function isCloudRuntime(): boolean {
  return getCursorSdkConfig().runtime === 'cloud';
}

function cloudRepoLine(): string {
  const config = getCursorSdkConfig();
  return `Repository: ${config.githubRepoUrl} (base branch: ${config.prBaseBranch}). Work in the Cursor cloud VM clone.`;
}

export function buildEventForgeAgentOptions(overrides?: Partial<AgentOptions>): AgentOptions {
  const config = getCursorSdkConfig();

  if (config.runtime === 'cloud') {
    return {
      apiKey: config.apiKey,
      model: { id: config.model },
      ...overrides,
      cloud: {
        repos: [{ url: config.githubRepoUrl, startingRef: config.prBaseBranch }],
        skipReviewerRequest: true,
        ...overrides?.cloud,
      },
    };
  }

  return {
    apiKey: config.apiKey,
    model: { id: config.model },
    ...overrides,
    local: {
      cwd: config.cwd,
      settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES,
      ...overrides?.local,
    },
  };
}

export function buildEventForgeTaskPrompt(task: string): string {
  const intro = isCloudRuntime()
    ? ['Work in this EventForge backend repository (Cursor cloud agent).', cloudRepoLine()]
    : ['Work in this EventForge repository.'];

  return [
    ...intro,
    'Follow .cursor/rules and use relevant .cursor/skills for this codebase.',
    'Implement the change in the working tree (not only a plan).',
    '',
    task.trim(),
  ].join('\n');
}

export function buildEventForgeCloudFinalizePrompt(options: {
  featureSummary: string;
  openPr: boolean;
}): string {
  const prLine = options.openPr
    ? 'Open a GitHub PR (autoCreatePR is enabled). Use a conventional commit message.'
    : 'Commit and push to a feature branch. Do not open a PR.';

  return [
    'Finalize the cloud agent session.',
    cloudRepoLine(),
    '',
    'Requirements:',
    '- Run targeted tests (npm run test:unit / test:integration) and fix failures.',
    '- Commit all changes with Conventional Commits (commitlint-friendly).',
    `- ${prLine}`,
    '',
    `Feature context: ${options.featureSummary.trim()}`,
  ].join('\n');
}

export interface EventForgeTestsTaskOptions {
  /** What was built or changed (from the prior feature task or user). */
  featureSummary?: string;
  /** Explicit paths to focus on; defaults to git working-tree changes. */
  changedPaths?: string[];
}

export interface EventForgeCommitTaskOptions {
  featureSummary?: string;
  changedPaths?: string[];
}

export interface EventForgePullRequestTaskOptions {
  featureSummary?: string;
  baseBranch?: string;
}

export function buildEventForgePullRequestPrompt(
  options: EventForgePullRequestTaskOptions = {}
): string {
  const config = getCursorSdkConfig();
  const baseBranch = options.baseBranch?.trim() || config.prBaseBranch;
  const summary = options.featureSummary?.trim();

  if (isCloudRuntime()) {
    return [
      'Work in this EventForge backend repository (Cursor cloud agent).',
      cloudRepoLine(),
      'Ensure changes are committed and pushed, then open or update the GitHub pull request.',
      `- Base branch: ${baseBranch}`,
      summary ? `\nFeature context:\n${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'Work in this EventForge backend repository.',
    'Open a GitHub pull request for the work that was just committed.',
    '',
    'Requirements:',
    '- Use the GitHub CLI (`gh`). If `gh` is missing or not logged in (`gh auth status`), explain and stop.',
    '- If on main/master with unpushed commits, create a feature branch first (e.g. feat/short-kebab-name).',
    '- Push the current branch: git push -u origin HEAD',
    '- Never force-push to main or master.',
    `- Base branch: ${baseBranch} (from repo default; do not use a branch that does not exist on origin)`,
    '- Confirm with: git ls-remote --heads origin ' + baseBranch + ' (or gh repo view --json defaultBranchRef)',
    '- Create the PR: gh pr create --base ' +
      baseBranch +
      ' --title "<conventional subject>" --body "<summary + test plan>"',
    '- If a PR already exists for this branch, run gh pr view and print its URL instead of creating a duplicate.',
    '- End by printing the PR URL (gh pr view --json url).',
    '',
    summary ? `Feature / change context:\n${summary}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildEventForgeCommitPrompt(options: EventForgeCommitTaskOptions = {}): string {
  const config = getCursorSdkConfig();
  const changedPaths =
    config.runtime === 'local'
      ? options.changedPaths && options.changedPaths.length > 0
        ? options.changedPaths
        : getWorkspaceChangedPaths(config.cwd)
      : options.changedPaths ?? [];

  const pathSection =
    changedPaths.length > 0
      ? changedPaths.map((p) => `- ${p}`).join('\n')
      : isCloudRuntime()
        ? '- (use git status in the cloud VM)'
        : '- (use git status to see all changes)';

  const summary = options.featureSummary?.trim();
  const intro = isCloudRuntime()
    ? ['Work in this EventForge backend repository (Cursor cloud agent).', cloudRepoLine()]
    : ['Work in this EventForge backend repository.'];

  return [
    ...intro,
    'Create a single git commit for the completed feature and its tests.',
    '',
    'Requirements:',
    '- Run git status first. Stage only intentional project files (src/, tests, config docs as needed).',
    '- NEVER stage or commit: .env, .env.*, credentials, secrets, node_modules, or dist/ artifacts unless the task explicitly requires them.',
    '- Use Conventional Commits that pass commitlint: type(scope): subject',
    '  - types: feat, fix, test, refactor, chore, etc. (lowercase)',
    '  - subject: lowercase, no trailing period, header max 72 characters',
    '  - prefer feat(scope): ... for user-facing features that include tests',
    '- Use git commit (not push). If the commit hook rejects the message, fix and retry.',
    '- Do not amend existing commits unless the hook auto-staged fixes.',
    '',
    summary ? `Feature / change context:\n${summary}\n` : '',
    'Changed paths to consider:',
    pathSection,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildEventForgeTestsPrompt(options: EventForgeTestsTaskOptions = {}): string {
  const config = getCursorSdkConfig();
  const changedPaths =
    config.runtime === 'local'
      ? options.changedPaths && options.changedPaths.length > 0
        ? options.changedPaths
        : getWorkspaceChangedPaths(config.cwd)
      : options.changedPaths ?? [];

  const pathSection = isCloudRuntime()
    ? changedPaths.length > 0
      ? changedPaths.map((p) => `- ${p}`).join('\n')
      : '- (use files changed in this cloud session for the feature)'
    : changedPaths.length > 0
      ? changedPaths.map((p) => `- ${p}`).join('\n')
      : '- (no git changes detected; inspect recent edits under src/)';

  const summary = options.featureSummary?.trim();
  const intro = isCloudRuntime()
    ? ['Work in this EventForge backend repository (Cursor cloud agent).', cloudRepoLine()]
    : ['Work in this EventForge backend repository.'];

  return [
    ...intro,
    'Follow .cursor/rules and the tdd-workflow skill.',
    'Generate or update Jest tests for code that was just changed.',
    '',
    'Requirements:',
    '- Match existing patterns in src/test/unit and src/test/integration (supertest, mongo-memory or persistent db as peers do).',
    '- Cover happy paths, validation errors, and auth/permission edges where relevant.',
    '- Run targeted tests (npm run test:unit / test:integration) and fix failures before finishing.',
    '- Do not change production behavior unless required to fix a test bug.',
    '',
    summary ? `Feature / change context:\n${summary}\n` : '',
    'Touched or related paths (from git working tree):',
    pathSection,
  ]
    .filter(Boolean)
    .join('\n');
}

async function runEventForgeProjectTask(
  prompt: string,
  overrides?: Partial<AgentOptions>
): Promise<RunResult> {
  return withEventForgeAgent((agent) => runLocalAgentPrompt(agent, prompt), overrides);
}

export async function disposeAgent(agent: SDKAgent): Promise<void> {
  await agent[Symbol.asyncDispose]();
}

/**
 * Runs `fn` with a Cursor agent (local or cloud per config) and always disposes afterward.
 */
export async function withEventForgeAgent<T>(
  fn: (agent: SDKAgent) => Promise<T>,
  overrides?: Partial<AgentOptions>
): Promise<T> {
  const agent = await Agent.create(buildEventForgeAgentOptions(overrides));
  try {
    return await fn(agent);
  } finally {
    await disposeAgent(agent);
  }
}

/** @deprecated Use withEventForgeAgent */
export const withLocalAgent = withEventForgeAgent;

/**
 * One-shot prompt. Creates an agent, runs the prompt, and disposes automatically.
 */
export async function promptLocalAgent(
  message: string,
  overrides?: Partial<AgentOptions>
): Promise<RunResult> {
  return Agent.prompt(message, buildEventForgeAgentOptions(overrides));
}

export function isCursorStartupError(error: unknown): error is CursorAgentError {
  return error instanceof CursorAgentError;
}

export function writeAssistantTextFromEvent(event: SDKMessage): void {
  if (event.type !== 'assistant') {
    return;
  }
  for (const block of event.message.content) {
    if (block.type === 'text') {
      process.stdout.write(block.text);
    }
  }
}

/** Streams assistant text to stdout; tool/status lines to stderr. */
export function streamRunEventToTerminal(event: SDKMessage): void {
  switch (event.type) {
    case 'assistant':
      writeAssistantTextFromEvent(event);
      break;
    case 'tool_call':
      if (event.status === 'running') {
        process.stderr.write(`\n→ ${event.name}\n`);
      }
      break;
    case 'status':
      if (event.message) {
        process.stderr.write(`\n[${event.status}] ${event.message}\n`);
      }
      break;
    default:
      break;
  }
}

/**
 * Run a short implementation task against the EventForge repo with project
 * `.cursor` context and streamed terminal output.
 */
export async function runEventForgeTask(task: string): Promise<RunResult> {
  return runEventForgeProjectTask(buildEventForgeTaskPrompt(task));
}

/**
 * After a feature or local edits, add/update tests for touched areas.
 */
export async function runEventForgeTestsTask(
  options: EventForgeTestsTaskOptions = {}
): Promise<RunResult> {
  return runEventForgeProjectTask(buildEventForgeTestsPrompt(options));
}

export interface EventForgeTaskWithTestsResult {
  implementation: RunResult;
  tests: RunResult;
}

export interface EventForgeShipResult extends EventForgeTaskWithTestsResult {
  commit: RunResult;
  pullRequest?: RunResult;
  agentId?: string;
}

export interface RunEventForgeShipOptions {
  /** When false, skip push + gh pr create (default: true). */
  openPr?: boolean;
  /** When false, return run results even if a step status is error (Telegram). */
  throwOnRunError?: boolean;
  /** Disable stdout streaming (recommended for Telegram / PM2). */
  stream?: boolean;
  waitTimeoutMs?: number;
  onProgress?: (message: string) => void | Promise<void>;
}

export interface EventForgeTestsAndCommitResult {
  tests: RunResult;
  commit: RunResult;
  pullRequest?: RunResult;
}

export interface RunEventForgeTestsAndCommitOptions extends EventForgeTestsTaskOptions {
  openPr?: boolean;
}

/**
 * Implement a task, then in the same agent session update tests for the resulting diff.
 */
export async function runEventForgeTaskWithTests(task: string): Promise<EventForgeTaskWithTestsResult> {
  const config = getCursorSdkConfig();
  const changedPaths =
    config.runtime === 'local' ? getWorkspaceChangedPaths(config.cwd) : undefined;

  return withEventForgeAgent(async (agent) => {
    process.stderr.write('\n--- Implementation ---\n\n');
    const implementation = await runLocalAgentPrompt(agent, buildEventForgeTaskPrompt(task));

    process.stderr.write('\n--- Tests for touched areas ---\n\n');
    const tests = await runLocalAgentPrompt(
      agent,
      buildEventForgeTestsPrompt({
        featureSummary: task,
        changedPaths,
      })
    );

    return { implementation, tests };
  });
}

/**
 * Full pipeline: implement → tests → commit → open GitHub PR (optional).
 */
async function notifyProgress(
  options: RunEventForgeShipOptions | undefined,
  message: string
): Promise<void> {
  process.stderr.write(`${message}\n`);
  if (options?.onProgress) {
    await options.onProgress(message);
  }
}

export async function fetchCloudAgentPrUrl(agentId: string): Promise<string | undefined> {
  if (!agentId.startsWith('bc-')) {
    return undefined;
  }
  const config = getCursorSdkConfig();
  try {
    const runs = await Agent.listRuns(agentId, {
      apiKey: config.apiKey,
      runtime: 'cloud',
    });
    for (const run of runs.items) {
      const prUrl = extractPrUrlFromRunResults({
        id: run.id,
        status: 'finished',
        git: run.git,
      });
      if (prUrl) {
        return prUrl;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function runEventForgeShip(
  task: string,
  options: RunEventForgeShipOptions = {}
): Promise<EventForgeShipResult> {
  const config = getCursorSdkConfig();
  const openPr = options.openPr !== false;
  const promptOptions = {
    stream: options.stream,
    waitTimeoutMs: options.waitTimeoutMs,
    throwOnError: options.throwOnRunError,
  };

  if (config.runtime === 'cloud') {
    const totalSteps = 3;
    return withEventForgeAgent(
      async (agent) => {
        await notifyProgress(options, `Step 1/${totalSteps}: implementation (cloud)…`);
        process.stderr.write(`\n--- 1/${totalSteps} Implementation (cloud) ---\n\n`);
        const implementation = await runLocalAgentPrompt(
          agent,
          buildEventForgeTaskPrompt(task),
          promptOptions
        );
        await notifyProgress(
          options,
          `Step 1/${totalSteps} done (${implementation.status}).`
        );

        await notifyProgress(options, `Step 2/${totalSteps}: tests (cloud)…`);
        process.stderr.write(`\n--- 2/${totalSteps} Tests (cloud) ---\n\n`);
        const tests = await runLocalAgentPrompt(
          agent,
          buildEventForgeTestsPrompt({ featureSummary: task }),
          promptOptions
        );
        await notifyProgress(options, `Step 2/${totalSteps} done (${tests.status}).`);

        await notifyProgress(options, `Step 3/${totalSteps}: finalize + PR (cloud)…`);
        process.stderr.write(`\n--- 3/${totalSteps} Finalize (cloud) ---\n\n`);
        const commit = await runLocalAgentPrompt(
          agent,
          buildEventForgeCloudFinalizePrompt({ featureSummary: task, openPr }),
          promptOptions
        );
        await notifyProgress(options, `Step 3/${totalSteps} done (${commit.status}).`);

        const pullRequest = openPr ? commit : undefined;
        return {
          implementation,
          tests,
          commit,
          pullRequest,
          agentId: agent.agentId,
        };
      },
      { cloud: { autoCreatePR: openPr } }
    );
  }

  const totalSteps = openPr ? 4 : 3;
  const changedAfterImpl = getWorkspaceChangedPaths(config.cwd);

  return withEventForgeAgent(async (agent) => {
    process.stderr.write(`\n--- 1/${totalSteps} Implementation ---\n\n`);
    const implementation = await runLocalAgentPrompt(agent, buildEventForgeTaskPrompt(task));

    process.stderr.write(`\n--- 2/${totalSteps} Tests ---\n\n`);
    const tests = await runLocalAgentPrompt(
      agent,
      buildEventForgeTestsPrompt({
        featureSummary: task,
        changedPaths: changedAfterImpl,
      })
    );

    process.stderr.write(`\n--- 3/${totalSteps} Commit ---\n\n`);
    const commit = await runLocalAgentPrompt(
      agent,
      buildEventForgeCommitPrompt({
        featureSummary: task,
        changedPaths: getWorkspaceChangedPaths(config.cwd),
      })
    );

    let pullRequest: RunResult | undefined;
    if (openPr) {
      process.stderr.write(`\n--- 4/${totalSteps} Pull request ---\n\n`);
      pullRequest = await runLocalAgentPrompt(
        agent,
        buildEventForgePullRequestPrompt({ featureSummary: task })
      );
    }

    return { implementation, tests, commit, pullRequest, agentId: agent.agentId };
  });
}

export async function formatEventForgeShipSummary(
  result: EventForgeShipResult,
  openPr: boolean
): Promise<string> {
  const lines = [
    `implementation: ${result.implementation.status}`,
    `tests: ${result.tests.status}`,
    `commit: ${result.commit.status}`,
  ];
  if (openPr && result.pullRequest) {
    lines.push(`pr: ${result.pullRequest.status}`);
  }
  let prUrl = extractPrUrlFromRunResults(
    result.implementation,
    result.tests,
    result.commit,
    ...(result.pullRequest ? [result.pullRequest] : [])
  );
  if (!prUrl && result.agentId) {
    prUrl = await fetchCloudAgentPrUrl(result.agentId);
  }
  if (prUrl) {
    lines.push(`pr url: ${prUrl}`);
  }
  const allOk =
    result.implementation.status === 'finished' &&
    result.tests.status === 'finished' &&
    result.commit.status === 'finished';
  lines.push(allOk ? 'status: done' : 'status: finished with warnings — check GitHub');
  return lines.join('\n');
}

/**
 * Push branch and open a GitHub PR (after commit).
 */
export async function runEventForgePullRequestTask(
  options: EventForgePullRequestTaskOptions = {}
): Promise<RunResult> {
  return runEventForgeProjectTask(buildEventForgePullRequestPrompt(options));
}

/**
 * After manual implementation: update tests, then commit (same agent session).
 */
export async function runEventForgeTestsAndCommit(
  options: RunEventForgeTestsAndCommitOptions = {}
): Promise<EventForgeTestsAndCommitResult> {
  const config = getCursorSdkConfig();
  const summary = options.featureSummary?.trim();
  const openPr = options.openPr === true;
  const totalSteps = openPr ? 3 : 2;

  const changedPaths =
    config.runtime === 'local'
      ? options.changedPaths ?? getWorkspaceChangedPaths(config.cwd)
      : options.changedPaths;

  return withEventForgeAgent(
    async (agent) => {
      process.stderr.write(`\n--- 1/${totalSteps} Tests ---\n\n`);
      const tests = await runLocalAgentPrompt(
        agent,
        buildEventForgeTestsPrompt({
          ...options,
          changedPaths,
        })
      );

      process.stderr.write(`\n--- 2/${totalSteps} Commit ---\n\n`);
      const commit = await runLocalAgentPrompt(
        agent,
        buildEventForgeCommitPrompt({
          featureSummary: summary,
          changedPaths,
        })
      );

      let pullRequest: RunResult | undefined;
      if (openPr) {
        process.stderr.write(`\n--- 3/${totalSteps} Pull request ---\n\n`);
        pullRequest = await runLocalAgentPrompt(
          agent,
          buildEventForgePullRequestPrompt({ featureSummary: summary })
        );
      }

      return { tests, commit, pullRequest };
    },
    openPr && config.runtime === 'cloud' ? { cloud: { autoCreatePR: true } } : undefined
  );
}

/**
 * Commit only (when implementation and tests are already done).
 */
export async function runEventForgeCommitTask(
  options: EventForgeCommitTaskOptions = {}
): Promise<RunResult> {
  return runEventForgeProjectTask(buildEventForgeCommitPrompt(options));
}

const DEFAULT_RUN_WAIT_MS = 60 * 60 * 1000;

async function waitForRun(run: Run, timeoutMs: number): Promise<RunResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Cursor run timed out after ${Math.round(timeoutMs / 60000)} minutes: ${run.id}`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([run.wait(), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Sends a prompt, optionally streams assistant text to stdout, and returns the terminal result.
 */
export async function runLocalAgentPrompt(
  agent: SDKAgent,
  message: string,
  options?: {
    stream?: boolean;
    waitTimeoutMs?: number;
    throwOnError?: boolean;
  }
): Promise<RunResult> {
  const run = await agent.send(message);
  console.error(`cursor run started: agent=${agent.agentId} run=${run.id}`);

  if (options?.stream !== false) {
    for await (const event of run.stream()) {
      streamRunEventToTerminal(event);
    }
  }

  const result = await waitForRun(run, options?.waitTimeoutMs ?? DEFAULT_RUN_WAIT_MS);
  if (result.status === 'error' && options?.throwOnError !== false) {
    throw new Error(`Cursor run failed: ${run.id}`);
  }
  return result;
}

export type { CursorRuntime } from '../config/cursor.config';
export type { Run, RunResult, SDKAgent, SDKMessage, AgentOptions, CursorAgentError };
