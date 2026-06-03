import 'dotenv/config';
import {
  isCursorStartupError,
  promptLocalAgent,
  runLocalAgentPrompt,
  withLocalAgent,
} from '../lib/cursor-agent';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useSession = args.includes('--session');
  const prompt = args.filter((arg) => arg !== '--session').join(' ').trim();

  if (!prompt) {
    console.error('Usage: npm run cursor:prompt -- "<your prompt>" [--session]');
    console.error('  --session  reuse an agent (multi-turn) instead of one-shot');
    process.exit(1);
  }

  try {
    if (useSession) {
      await withLocalAgent(async (agent) => {
        const result = await runLocalAgentPrompt(agent, prompt);
        process.stdout.write('\n');
        logger.info(`Run finished: ${result.status}`);
      });
      return;
    }

    const result = await promptLocalAgent(prompt);
    process.stdout.write('\n');
    if (result.result) {
      console.log(result.result);
    }
    logger.info(`Run finished: ${result.status}`);
  } catch (error) {
    if (isCursorStartupError(error)) {
      logger.error(`Cursor startup failed: ${error.message} (retryable=${error.isRetryable})`);
      process.exit(1);
    }
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

void main();
