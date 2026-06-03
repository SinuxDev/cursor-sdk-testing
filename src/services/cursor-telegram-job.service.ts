import { randomUUID } from 'crypto';
import {
  formatEventForgeShipSummary,
  isCloudRuntime,
  isCursorStartupError,
  runEventForgeCommitTask,
  runEventForgePullRequestTask,
  runEventForgeShip,
  runEventForgeTask,
  runEventForgeTestsAndCommit,
  runEventForgeTestsTask,
  type RunEventForgeShipOptions,
} from '../lib/cursor-agent';
import { formatRunGitSummary } from '../lib/cursor-run-git';
import {
  getCurrentPullRequestUrl,
  getLatestCommitOneline,
  getWorkspaceChangedPaths,
} from '../lib/git-changed-files';
import { getCursorSdkConfig } from '../config/cursor.config';
import {
  getTelegramHelpText,
  parseTelegramInstruction,
  type ParsedTelegramInstruction,
  type TelegramCursorCommand,
} from '../lib/telegram-commands';
import { getTelegramConfig } from '../config/telegram.config';
import { telegramService } from './telegram.service';
import { logger } from '../utils/logger';

export type CursorTelegramJobStatus = 'queued' | 'running' | 'finished' | 'error';

export interface CursorTelegramJob {
  id: string;
  chatId: number;
  command: TelegramCursorCommand;
  instruction: string;
  status: CursorTelegramJobStatus;
  createdAt: string;
  finishedAt?: string;
  summary?: string;
  error?: string;
}

class CursorTelegramJobService {
  private readonly jobs = new Map<string, CursorTelegramJob>();
  private readonly chatActiveJob = new Map<number, string>();

  isChatAllowed(chatId: number): boolean {
    const { allowedChatIds } = getTelegramConfig();
    if (allowedChatIds.length === 0) {
      return true;
    }
    return allowedChatIds.includes(chatId);
  }

  getJob(jobId: string): CursorTelegramJob | undefined {
    return this.jobs.get(jobId);
  }

  getActiveJobForChat(chatId: number): CursorTelegramJob | undefined {
    const jobId = this.chatActiveJob.get(chatId);
    if (!jobId) {
      return undefined;
    }
    return this.jobs.get(jobId);
  }

  async handleUpdate(chatId: number, text: string): Promise<void> {
    if (!this.isChatAllowed(chatId)) {
      await telegramService.sendMessage(
        chatId,
        'This chat is not authorized. Set TELEGRAM_ALLOWED_CHAT_IDS on the server.'
      );
      return;
    }

    const parsed = parseTelegramInstruction(text);

    if (parsed.command === 'help') {
      await telegramService.sendMessage(chatId, getTelegramHelpText());
      return;
    }

    if (parsed.command === 'status') {
      const active = this.getActiveJobForChat(chatId);
      if (!active) {
        await telegramService.sendMessage(chatId, 'No active job for this chat.');
        return;
      }
      await telegramService.sendMessage(
        chatId,
        `Job ${active.id}\nCommand: /${active.command}\nStatus: ${active.status}\nTask: ${active.instruction || '(none)'}`
      );
      return;
    }

    if (!parsed.args && parsed.command !== 'tests' && parsed.command !== 'commit' && parsed.command !== 'pr') {
      await telegramService.sendMessage(
        chatId,
        `Missing instruction text. Example:\n/ship add RSVP limit to events`
      );
      return;
    }

    if (this.getActiveJobForChat(chatId)?.status === 'running') {
      await telegramService.sendMessage(
        chatId,
        'A Cursor job is already running for this chat. Send /status or wait for it to finish.'
      );
      return;
    }

    const job = this.createJob(chatId, parsed);
    void this.runJob(job, parsed);
  }

  private createJob(chatId: number, parsed: ParsedTelegramInstruction): CursorTelegramJob {
    const job: CursorTelegramJob = {
      id: randomUUID(),
      chatId,
      command: parsed.command,
      instruction: parsed.args,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    this.chatActiveJob.set(chatId, job.id);
    return job;
  }

  private async runJob(job: CursorTelegramJob, parsed: ParsedTelegramInstruction): Promise<void> {
    job.status = 'running';
    const label = parsed.command.toUpperCase();

    try {
      const runtime = getCursorSdkConfig().runtime;
      await telegramService.sendMessage(
        job.chatId,
        `Started ${label} job ${job.id.slice(0, 8)} (${runtime})…\n${summarizeInstruction(parsed)}`
      );

      const summary = await this.executeCommand(job, parsed);
      job.status = 'finished';
      job.summary = summary;
      job.finishedAt = new Date().toISOString();

      await telegramService.sendMessage(job.chatId, `✅ Finished ${label}\n\n${summary}`);
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : String(error);
      job.finishedAt = new Date().toISOString();

      logger.error('Cursor Telegram job failed', { jobId: job.id, error: job.error });

      const hint = isCursorStartupError(error)
        ? `\nRetryable: ${error.isRetryable}`
        : '';
      await telegramService.sendMessage(
        job.chatId,
        `❌ Failed ${label}\n\n${job.error}${hint}\n\nCheck GitHub for a PR that may have been opened anyway.`
      );
    } finally {
      if (job.status === 'running') {
        job.status = 'error';
        job.error = 'Job stopped without a final status (process crash or disconnect).';
        job.finishedAt = new Date().toISOString();
        try {
          await telegramService.sendMessage(
            job.chatId,
            `⚠️ ${label} ended unexpectedly.\n\n${job.error}\nCheck pm2 logs and GitHub PRs.`
          );
        } catch (notifyError) {
          logger.error('Failed to send Telegram crash notification', notifyError);
        }
      }
      this.chatActiveJob.delete(job.chatId);
    }
  }

  private async executeCommand(
    job: CursorTelegramJob,
    parsed: ParsedTelegramInstruction
  ): Promise<string> {
    const { command, args, noPr } = parsed;
    const shipOptions: RunEventForgeShipOptions = {
      openPr: !noPr,
      throwOnRunError: false,
      stream: false,
      onProgress: async (message) => {
        await telegramService.sendMessage(job.chatId, message);
      },
    };

    switch (command) {
      case 'ship': {
        const result = await runEventForgeShip(args, shipOptions);
        return formatEventForgeShipSummary(result, shipOptions.openPr !== false);
      }
      case 'task': {
        const result = await runEventForgeTask(args);
        return formatRunResult('task', result.status);
      }
      case 'tests': {
        const config = getCursorSdkConfig();
        const result = await runEventForgeTestsTask({
          featureSummary: args || undefined,
          changedPaths:
            config.runtime === 'local' ? getWorkspaceChangedPaths(config.cwd) : undefined,
        });
        const gitLine = formatRunGitSummary(result);
        return [formatRunResult('tests', result.status), gitLine].filter(Boolean).join('\n');
      }
      case 'commit': {
        const openPr = /--pr\b/.test(args);
        const summary = args.replace(/--pr\b/g, '').trim();
        if (openPr) {
          const config = getCursorSdkConfig();
          const { tests, commit, pullRequest } = await runEventForgeTestsAndCommit({
            featureSummary: summary || undefined,
            changedPaths:
              config.runtime === 'local' ? getWorkspaceChangedPaths(config.cwd) : undefined,
            openPr: true,
          });
          const gitLine = formatRunGitSummary(
            tests,
            commit,
            ...(pullRequest ? [pullRequest] : [])
          );
          return [
            formatRunResult('tests', tests.status),
            formatRunResult('commit', commit.status),
            pullRequest ? formatRunResult('pr', pullRequest.status) : '',
            gitLine || formatGitSummary(),
          ]
            .filter(Boolean)
            .join('\n');
        }
        const config = getCursorSdkConfig();
        const result = await runEventForgeCommitTask({
          featureSummary: summary || undefined,
          changedPaths:
            config.runtime === 'local' ? getWorkspaceChangedPaths(config.cwd) : undefined,
        });
        const gitLine = formatRunGitSummary(result);
        return [formatRunResult('commit', result.status), gitLine || formatGitSummary()].join(
          '\n'
        );
      }
      case 'pr': {
        const result = await runEventForgePullRequestTask({
          featureSummary: args || undefined,
        });
        const gitLine = formatRunGitSummary(result);
        return [formatRunResult('pr', result.status), gitLine || formatGitSummary()].join('\n');
      }
      default:
        return getTelegramHelpText();
    }
  }
}

function summarizeInstruction(parsed: ParsedTelegramInstruction): string {
  if (parsed.command === 'ship' || parsed.command === 'task') {
    const prNote = parsed.command === 'ship' && parsed.noPr ? ' (no PR)' : '';
    return `Task: ${parsed.args}${prNote}`;
  }
  if (parsed.args) {
    return `Context: ${parsed.args}`;
  }
  return `Command: /${parsed.command}`;
}

function formatRunResult(step: string, status: string): string {
  return `${step}: ${status}`;
}

function formatGitSummary(): string {
  if (isCloudRuntime()) {
    return '';
  }
  const lines: string[] = [];
  const commit = getLatestCommitOneline();
  const prUrl = getCurrentPullRequestUrl();
  if (commit) {
    lines.push(`commit: ${commit}`);
  }
  if (prUrl) {
    lines.push(`pr: ${prUrl}`);
  }
  return lines.join('\n');
}

export const cursorTelegramJobService = new CursorTelegramJobService();
