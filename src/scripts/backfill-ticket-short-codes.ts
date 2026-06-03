import mongoose from 'mongoose';
import crypto from 'crypto';
import { Ticket } from '../models/ticket.model';
import { logger } from '../utils/logger';

const SHORT_CODE_LENGTH = 8;
const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ASSIGN_ATTEMPTS = 5;

const generateShortCode = (): string => {
  const bytes = crypto.randomBytes(SHORT_CODE_LENGTH);
  let value = '';

  for (let index = 0; index < SHORT_CODE_LENGTH; index += 1) {
    value += SHORT_CODE_ALPHABET[bytes[index] % SHORT_CODE_ALPHABET.length];
  }

  return value;
};

async function assignShortCode(ticketId: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt += 1) {
    const shortCode = generateShortCode();

    try {
      const updated = await Ticket.findOneAndUpdate(
        {
          _id: ticketId,
          $or: [{ shortCode: { $exists: false } }, { shortCode: null }, { shortCode: '' }],
        },
        {
          $set: {
            shortCode,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).exec();

      return Boolean(updated?.shortCode);
    } catch (error) {
      const duplicateError =
        error instanceof Error &&
        (error as Error & { name?: string }).name === 'MongoServerError' &&
        (error as Error & { code?: number }).code === 11000;

      if (!duplicateError) {
        throw error;
      }
    }
  }

  return false;
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri);

  const tickets = await Ticket.find({
    $or: [{ shortCode: { $exists: false } }, { shortCode: null }, { shortCode: '' }],
  })
    .select('_id')
    .lean()
    .exec();

  let updatedCount = 0;
  let failedCount = 0;

  for (const ticket of tickets) {
    const success = await assignShortCode(String(ticket._id));
    if (success) {
      updatedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  logger.info('[tickets] short code backfill finished', {
    total: tickets.length,
    updatedCount,
    failedCount,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  logger.error('[tickets] short code backfill failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(1);
});
