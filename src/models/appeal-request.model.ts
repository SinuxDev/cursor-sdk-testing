import mongoose, { Document, Schema } from 'mongoose';

export type AppealIssueType =
  | 'account_suspension'
  | 'policy_warning'
  | 'payment_restriction'
  | 'content_violation'
  | 'other';

export type AppealStatus = 'submitted' | 'in_review' | 'resolved' | 'rejected';

export interface IAppealRequest extends Document {
  referenceCode: string;
  fullName: string;
  workEmail: string;
  company: string;
  accountEmail: string;
  issueType: AppealIssueType;
  timeline: string;
  whatHappened: string;
  correctiveActions: string;
  evidenceLinks: string[];
  consent: boolean;
  source: 'public-website' | 'authenticated-website';
  status: AppealStatus;
  createdAt: Date;
  updatedAt: Date;
}

const appealRequestSchema = new Schema<IAppealRequest>(
  {
    referenceCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    workEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid work email'],
    },
    company: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    accountEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid account email'],
    },
    issueType: {
      type: String,
      required: true,
      enum: [
        'account_suspension',
        'policy_warning',
        'payment_restriction',
        'content_violation',
        'other',
      ],
    },
    timeline: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    whatHappened: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },
    correctiveActions: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },
    evidenceLinks: {
      type: [String],
      default: [],
    },
    consent: {
      type: Boolean,
      required: true,
      default: false,
    },
    source: {
      type: String,
      enum: ['public-website', 'authenticated-website'],
      default: 'public-website',
    },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'resolved', 'rejected'],
      default: 'submitted',
    },
  },
  {
    timestamps: true,
  }
);

appealRequestSchema.index({ workEmail: 1, createdAt: -1 });
appealRequestSchema.index({ status: 1, createdAt: -1 });

export const AppealRequest = mongoose.model<IAppealRequest>('AppealRequest', appealRequestSchema);
