import mongoose, { Document, Schema } from 'mongoose';

export type RsvpStatus = 'registered' | 'waitlisted' | 'cancelled';

export interface IRsvpFormResponse {
  question: string;
  answer: string;
}

export interface IRsvp extends Document {
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  status: RsvpStatus;
  formResponses: IRsvpFormResponse[];
  waitlistPosition?: number;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rsvpFormResponseSchema = new Schema<IRsvpFormResponse>(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [120, 'Question cannot exceed 120 characters'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      maxlength: [500, 'Answer cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const rsvpSchema = new Schema<IRsvp>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'cancelled'],
      default: 'registered',
    },
    formResponses: {
      type: [rsvpFormResponseSchema],
      default: [],
    },
    waitlistPosition: {
      type: Number,
      min: [1, 'Waitlist position must be at least 1'],
    },
    cancelledAt: {
      type: Date,
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

rsvpSchema.index({ event: 1, user: 1 }, { unique: true });
rsvpSchema.index({ event: 1, status: 1, createdAt: 1 });
rsvpSchema.index({ user: 1, createdAt: -1 });

export const Rsvp = mongoose.model<IRsvp>('Rsvp', rsvpSchema);
