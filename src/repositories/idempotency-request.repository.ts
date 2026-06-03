import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  IIdempotencyRequest,
  IdempotencyRequest,
  IdempotencyRequestStatus,
} from '../models/idempotency-request.model';

interface CreateInProgressInput {
  userId: string;
  operation: string;
  key: string;
  requestFingerprint: string;
  ttlMs: number;
}

interface CompleteInput {
  id: string;
  statusCode: number;
  responseBody: unknown;
}

class IdempotencyRequestRepository extends BaseRepository<IIdempotencyRequest> {
  constructor() {
    super(IdempotencyRequest);
  }

  async findActiveByUserOperationAndKey(
    userId: string,
    operation: string,
    key: string
  ): Promise<IIdempotencyRequest | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return this.model
      .findOne({
        userId: new mongoose.Types.ObjectId(userId),
        operation,
        key,
        expiresAt: { $gt: new Date() },
      } as FilterQuery<IIdempotencyRequest>)
      .exec();
  }

  async createInProgress(input: CreateInProgressInput): Promise<IIdempotencyRequest> {
    const expiresAt = new Date(Date.now() + input.ttlMs);
    return this.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      operation: input.operation,
      key: input.key,
      requestFingerprint: input.requestFingerprint,
      status: 'in_progress',
      expiresAt,
    } as Partial<IIdempotencyRequest>);
  }

  async markAs(
    id: string,
    status: IdempotencyRequestStatus,
    statusCode?: number,
    responseBody?: unknown
  ): Promise<IIdempotencyRequest | null> {
    return this.update(id, {
      $set: {
        status,
        ...(typeof statusCode === 'number' ? { statusCode } : {}),
        ...(typeof responseBody !== 'undefined' ? { responseBody } : {}),
      },
    });
  }

  async complete(input: CompleteInput): Promise<IIdempotencyRequest | null> {
    return this.markAs(input.id, 'completed', input.statusCode, input.responseBody);
  }
}

export const idempotencyRequestRepository = new IdempotencyRequestRepository();
