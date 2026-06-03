import 'dotenv/config';
import { assertTelegramConfigured } from '../config/telegram.config';

async function main(): Promise<void> {
  const config = assertTelegramConfigured();
  const webhookUrl = process.argv[2]?.trim();

  if (!webhookUrl) {
    console.error('Usage: npm run telegram:webhook -- "https://your-host/api/v1/telegram/webhook/<secret>"');
    console.error(`Secret must match TELEGRAM_WEBHOOK_SECRET (${config.webhookSecret ? 'set' : 'missing'})`);
    process.exit(1);
  }

  if (!config.webhookSecret) {
    console.error('TELEGRAM_WEBHOOK_SECRET is required');
    process.exit(1);
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );

  const payload = (await response.json()) as { ok: boolean; description?: string };
  if (!payload.ok) {
    console.error(payload.description || 'setWebhook failed');
    process.exit(1);
  }

  console.log(`Webhook set: ${webhookUrl}`);
}

void main();
