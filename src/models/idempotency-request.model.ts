import mongoose, { Document, Schema } from 'mongoose';

export type IdempotencyRequestStatus = 'in_progress' | 'completed';

export interface IIdempotencyRequest extends Document {
  userId: mongoose.Types.ObjectId;
  operation: string;
  key: string;
  requestFingerprint: string;
  status: IdempotencyRequestStatus;
  statusCode?: number;
  responseBody?: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const idempotencyRequestSchema = new Schema<IIdempotencyRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operation: {
      type: String,
      required: [true, 'Operation is required'],
      trim: true,
      maxlength: [120, 'Operation cannot exceed 120 characters'],
    },
    key: {
      type: String,
      required: [true, 'Idempotency key is required'],
      trim: true,
      maxlength: [255, 'Idempotency key cannot exceed 255 characters'],
    },
    requestFingerprint: {
      type: String,
      required: [true, 'Request fingerprint is required'],
      trim: true,
      maxlength: [128, 'Request fingerprint cannot exceed 128 characters'],
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      required: true,
    },
    statusCode: {
      type: Number,
      min: 100,
      max: 599,
    },
    responseBody: {
      type: Schema.Types.Mixed,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

idempotencyRequestSchema.index({ userId: 1, operation: 1, key: 1 }, { unique: true });
idempotencyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRequest = mongoose.model<IIdempotencyRequest>(
  'IdempotencyRequest',
  idempotencyRequestSchema
);
