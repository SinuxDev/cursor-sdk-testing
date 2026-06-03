import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { idempotencyRequestRepository } from '../repositories/idempotency-request.repository';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface IdempotencyOptions {
  operation: string;
  ttlMs?: number;
}

type JsonLike = Record<string, unknown> | unknown[] | string | number | boolean | null;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === 'object') {
    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)]);

    return Object.fromEntries(normalizedEntries);
  }

  return value;
};

const computeFingerprint = (input: {
  operation: string;
  method: string;
  params: unknown;
  query: unknown;
  body: unknown;
}): string => {
  const normalized = normalizeValue(input);
  const serialized = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(serialized).digest('hex');
};

const tryReplay = (
  entry: {
    statusCode?: number;
    responseBody?: unknown;
  },
  res: Response
): boolean => {
  if (typeof entry.statusCode !== 'number' || typeof entry.responseBody === 'undefined') {
    return false;
  }

  res.setHeader('Idempotency-Replayed', 'true');
  res.status(entry.statusCode).json(entry.responseBody as JsonLike);
  return true;
};

export const requireIdempotency = (options: IdempotencyOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError('Unauthorized', 401));
      }

      const rawKey = req.header('Idempotency-Key');
      const key = typeof rawKey === 'string' ? rawKey.trim() : '';
      if (!key) {
        return next(new AppError('Idempotency-Key header is required', 400));
      }

      if (key.length > 255) {
        return next(new AppError('Idempotency-Key cannot exceed 255 characters', 400));
      }

      const requestFingerprint = computeFingerprint({
        operation: options.operation,
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body,
      });

      const userId = String(req.user._id);
      const operation = options.operation;
      const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

      const resolveExisting = async () => {
        const existing = await idempotencyRequestRepository.findActiveByUserOperationAndKey(
          userId,
          operation,
          key
        );

        if (!existing) {
          return null;
        }

        if (existing.requestFingerprint !== requestFingerprint) {
          throw new AppError('Idempotency-Key already used with a different request payload', 422);
        }

        if (existing.status === 'completed') {
          if (tryReplay(existing, res)) {
            return 'replayed';
          }

          throw new AppError('Stored idempotent response is unavailable', 500);
        }

        throw new AppError('A request with this Idempotency-Key is still in progress', 409);
      };

      const existingState = await resolveExisting();
      if (existingState === 'replayed') {
        return;
      }

      let idempotencyEntry;
      try {
        idempotencyEntry = await idempotencyRequestRepository.createInProgress({
          userId,
          operation,
          key,
          requestFingerprint,
          ttlMs,
        });
      } catch (error) {
        const duplicateError =
          error instanceof Error &&
          (error as Error & { name?: string }).name === 'MongoServerError' &&
          (error as Error & { code?: number }).code === 11000;

        if (!duplicateError) {
          throw error;
        }

        const raceState = await resolveExisting();
        if (raceState === 'replayed') {
          return;
        }

        throw new AppError('Unable to initialize idempotency entry', 500);
      }

      let responseBody: unknown;
      let responseCaptured = false;

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = ((body?: unknown) => {
        responseBody = body;
        responseCaptured = true;
        return originalJson(body as JsonLike);
      }) as Response['json'];

      res.send = ((body?: unknown) => {
        if (!responseCaptured) {
          responseBody = body;
          responseCaptured = true;
        }

        return originalSend(body as JsonLike);
      }) as Response['send'];

      res.on('finish', () => {
        void idempotencyRequestRepository
          .complete({
            id: String(idempotencyEntry._id),
            statusCode: res.statusCode,
            responseBody: responseCaptured ? responseBody : null,
          })
          .catch((error: unknown) => {
            logger.warn('[idempotency] failed to store response snapshot', {
              operation,
              userId,
              idempotencyKey: key,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};
