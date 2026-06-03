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
import { getCursorSdkConfig } from '../config/cursor.config';
import { getWorkspaceChangedPaths } from './git-changed-files';

/** Loads `.cursor/rules`, skills, hooks, MCP, and agents from the repo. */
export const EVENT_FORGE_PROJECT_SETTING_SOURCES: SettingSource[] = ['project'];

function localAgentOptions(
  overrides?: Partial<AgentOptions>,
  settingSources: SettingSource[] = []
): AgentOptions {
  const config = getCursorSdkConfig();
  return {
    apiKey: config.apiKey,
    model: { id: config.model },
    ...overrides,
    local: {
      cwd: config.cwd,
      settingSources,
      ...overrides?.local,
    },
  };
}

export function buildEventForgeTaskPrompt(task: string): string {
  return [
    'Work in this EventForge repository.',
    'Follow .cursor/rules and use relevant .cursor/skills for this codebase.',
    'Implement the change in the working tree (not only a plan).',
    '',
    task.trim(),
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

  return [
    'Work in this EventForge backend repository.',
    'Open a GitHub pull request for the work that was just committed.',
    '',
    'Requirements:',
    '- Use the GitHub CLI (`gh`). If `gh` is missing or not logged in (`gh auth status`), explain and stop.',
    '- If on main/master with unpushed commits, create a feature branch first (e.g. feat/short-kebab-name).',
    '- Push the current branch: git push -u origin HEAD',
    '- Never force-push to main or master.',
    `- Base branch: ${baseBranch}`,
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
    options.changedPaths && options.changedPaths.length > 0
      ? options.changedPaths
      : getWorkspaceChangedPaths(config.cwd);

  const pathSection =
    changedPaths.length > 0
      ? changedPaths.map((p) => `- ${p}`).join('\n')
      : '- (use git status to see all changes)';

  const summary = options.featureSummary?.trim();

  return [
    'Work in this EventForge backend repository.',
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
    options.changedPaths && options.changedPaths.length > 0
      ? options.changedPaths
      : getWorkspaceChangedPaths(config.cwd);

  const pathSection =
    changedPaths.length > 0
      ? changedPaths.map((p) => `- ${p}`).join('\n')
      : '- (no git changes detected; inspect recent edits under src/)';

  const summary = options.featureSummary?.trim();

  return [
    'Work in this EventForge backend repository.',
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

async function runEventForgeProjectTask(prompt: string): Promise<RunResult> {
  return withLocalAgent(
    (agent) => runLocalAgentPrompt(agent, prompt),
    { local: { settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES } }
  );
}

export async function disposeAgent(agent: SDKAgent): Promise<void> {
  await agent[Symbol.asyncDispose]();
}

/**
 * Runs `fn` with a local Cursor agent and always disposes the handle afterward.
 */
export async function withLocalAgent<T>(
  fn: (agent: SDKAgent) => Promise<T>,
  overrides?: Partial<AgentOptions>
): Promise<T> {
  const agent = await Agent.create(localAgentOptions(overrides));
  try {
    return await fn(agent);
  } finally {
    await disposeAgent(agent);
  }
}

/**
 * One-shot local prompt. Creates an agent, runs the prompt, and disposes automatically.
 */
export async function promptLocalAgent(
  message: string,
  overrides?: Partial<AgentOptions>
): Promise<RunResult> {
  return Agent.prompt(message, localAgentOptions(overrides));
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
}

export interface RunEventForgeShipOptions {
  /** When false, skip push + gh pr create (default: true). */
  openPr?: boolean;
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

  return withLocalAgent(
    async (agent) => {
      process.stderr.write('\n--- Implementation ---\n\n');
      const implementation = await runLocalAgentPrompt(agent, buildEventForgeTaskPrompt(task));

      process.stderr.write('\n--- Tests for touched areas ---\n\n');
      const tests = await runLocalAgentPrompt(
        agent,
        buildEventForgeTestsPrompt({
          featureSummary: task,
          changedPaths: getWorkspaceChangedPaths(config.cwd),
        })
      );

      return { implementation, tests };
    },
    { local: { settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES } }
  );
}

/**
 * Full pipeline: implement → tests → commit → open GitHub PR (optional).
 */
export async function runEventForgeShip(
  task: string,
  options: RunEventForgeShipOptions = {}
): Promise<EventForgeShipResult> {
  const config = getCursorSdkConfig();
  const openPr = options.openPr !== false;
  const totalSteps = openPr ? 4 : 3;

  return withLocalAgent(
    async (agent) => {
      process.stderr.write(`\n--- 1/${totalSteps} Implementation ---\n\n`);
      const implementation = await runLocalAgentPrompt(agent, buildEventForgeTaskPrompt(task));

      const changedAfterImpl = getWorkspaceChangedPaths(config.cwd);

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

      return { implementation, tests, commit, pullRequest };
    },
    { local: { settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES } }
  );
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

  return withLocalAgent(
    async (agent) => {
      process.stderr.write(`\n--- 1/${totalSteps} Tests ---\n\n`);
      const tests = await runLocalAgentPrompt(
        agent,
        buildEventForgeTestsPrompt({
          ...options,
          changedPaths: options.changedPaths ?? getWorkspaceChangedPaths(config.cwd),
        })
      );

      process.stderr.write(`\n--- 2/${totalSteps} Commit ---\n\n`);
      const commit = await runLocalAgentPrompt(
        agent,
        buildEventForgeCommitPrompt({
          featureSummary: summary,
          changedPaths: getWorkspaceChangedPaths(config.cwd),
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
    { local: { settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES } }
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

/**
 * Sends a prompt, optionally streams assistant text to stdout, and returns the terminal result.
 */
export async function runLocalAgentPrompt(
  agent: SDKAgent,
  message: string,
  options?: { stream?: boolean }
): Promise<RunResult> {
  const run = await agent.send(message);
  console.error(`cursor run started: agent=${agent.agentId} run=${run.id}`);

  if (options?.stream !== false) {
    for await (const event of run.stream()) {
      streamRunEventToTerminal(event);
    }
  }

  const result = await run.wait();
  if (result.status === 'error') {
    throw new Error(`Cursor run failed: ${run.id}`);
  }
  return result;
}

export type { Run, RunResult, SDKAgent, SDKMessage, AgentOptions, CursorAgentError };
