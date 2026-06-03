import { execSync, spawn } from 'child_process';
import { getCursorSdkConfig } from '../config/cursor.config';

/** Delay before PM2 restarts the Telegram bot so this process can finish Telegram replies. */
const BOT_RESTART_DELAY_MS = 2500;

const MAX_OUTPUT_CHARS = 1200;

function truncateOutput(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_OUTPUT_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_OUTPUT_CHARS)}\n…(truncated)`;
}

function runShellStep(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
  }).trim();
}

function pm2AppOnline(name: string): boolean {
  try {
    const raw = execSync(`pm2 jlist`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const processes = JSON.parse(raw) as Array<{ name?: string; pm2_env?: { status?: string } }>;
    const match = processes.find((p) => p.name === name);
    return match?.pm2_env?.status === 'online';
  } catch {
    return false;
  }
}

/** Restart a PM2 app after a delay in a detached shell (safe when restarting this Node process). */
export function schedulePm2Restart(appName: string, delayMs = BOT_RESTART_DELAY_MS): void {
  const delaySec = Math.max(1, Math.ceil(delayMs / 1000));
  const child = spawn('bash', ['-c', `sleep ${delaySec} && pm2 restart ${appName}`], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function checkApiHealth(port: string): string {
  try {
    const body = runShellStep(`curl -sf http://127.0.0.1:${port}/health`, process.cwd());
    return `API http://127.0.0.1:${port}/health: ok\n${truncateOutput(body)}`;
  } catch {
    return `API http://127.0.0.1:${port}/health: not reachable (start API with pm2 if needed)`;
  }
}

export async function runServerDeployRestart(
  onProgress?: (message: string) => Promise<void>
): Promise<string> {
  const cwd = getCursorSdkConfig().cwd;
  const botApp = process.env.TELEGRAM_PM2_BOT_APP?.trim() || 'telegram-bot';
  const apiApp = process.env.TELEGRAM_PM2_API_APP?.trim() || 'sinux-boilerplate';
  const port = process.env.PORT?.trim() || '5000';
  const lines: string[] = [];

  const progress = async (message: string): Promise<void> => {
    lines.push(message);
    if (onProgress) {
      await onProgress(message);
    }
  };

  await progress('1/4 git pull…');
  const pullOut = runShellStep('git pull', cwd);
  lines.push(`git pull: ok\n${truncateOutput(pullOut)}`);

  await progress('2/4 npm run build…');
  const buildOut = runShellStep('npm run build', cwd);
  lines.push(`build: ok\n${truncateOutput(buildOut)}`);

  await progress('3/4 health check…');
  const botOnlineBefore = pm2AppOnline(botApp);
  lines.push(`telegram-bot (${botApp}) before restart: ${botOnlineBefore ? 'online' : 'not online'}`);

  const apiOnline = pm2AppOnline(apiApp);
  if (apiOnline) {
    lines.push(`API process (${apiApp}): online`);
    lines.push(checkApiHealth(port));
  } else {
    lines.push(`API process (${apiApp}): not in pm2 (skipped health URL)`);
  }

  await progress(`4/4 pm2 restart…`);
  if (pm2AppOnline(apiApp)) {
    const apiRestartOut = runShellStep(`pm2 restart ${apiApp}`, cwd);
    lines.push(`pm2 ${apiApp}: ok\n${truncateOutput(apiRestartOut)}`);
  }

  schedulePm2Restart(botApp);
  lines.push(
    `pm2 ${botApp}: restart scheduled in ${BOT_RESTART_DELAY_MS / 1000}s (avoids killing this deploy before Telegram reply)`
  );

  const head = runShellStep('git log -1 --oneline', cwd);
  lines.push(`latest commit: ${head}`);

  return lines.join('\n\n');
}
