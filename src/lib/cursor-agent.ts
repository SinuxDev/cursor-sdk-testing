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
  return withLocalAgent(
    (agent) => runLocalAgentPrompt(agent, buildEventForgeTaskPrompt(task)),
    { local: { settingSources: EVENT_FORGE_PROJECT_SETTING_SOURCES } }
  );
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
