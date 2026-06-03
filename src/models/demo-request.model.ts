import mongoose, { Document, Schema } from 'mongoose';

type DemoSource = 'public-website' | 'authenticated-website';
export type DemoRequestStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'scheduled'
  | 'completed'
  | 'no_show'
  | 'won'
  | 'lost'
  | 'nurture';
export type DemoRequestPriority = 'low' | 'medium' | 'high';
export type DemoReplyTemplateKey =
  | 'acknowledgement'
  | 'qualified_next_steps'
  | 'not_a_fit_polite'
  | 'reschedule_no_show';

export interface IDemoRequest extends Document {
  fullName: string;
  workEmail: string;
  company: string;
  role: string;
  teamSize: string;
  useCase: string;
  source: DemoSource;
  status: DemoRequestStatus;
  priority: DemoRequestPriority;
  ownerAdminId?: mongoose.Types.ObjectId;
  qualificationNotes?: string;
  acknowledgementSentAt?: Date;
  lastReplySentAt?: Date;
  lastReplyTemplateKey?: DemoReplyTemplateKey;
  replyCount: number;
  firstResponseAt?: Date;
  scheduledAt?: Date;
  lastContactAt?: Date;
  nextActionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const demoRequestSchema = new Schema<IDemoRequest>(
  {
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
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    company: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    teamSize: {
      type: String,
      required: true,
      trim: true,
    },
    useCase: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 180,
    },
    source: {
      type: String,
      enum: ['public-website', 'authenticated-website'],
      default: 'public-website',
    },
    status: {
      type: String,
      enum: [
        'new',
        'contacted',
        'qualified',
        'unqualified',
        'scheduled',
        'completed',
        'no_show',
        'won',
        'lost',
        'nurture',
      ],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    ownerAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    qualificationNotes: {
      type: String,
      trim: true,
      maxlength: [1500, 'Qualification notes cannot exceed 1500 characters'],
    },
    acknowledgementSentAt: {
      type: Date,
    },
    lastReplySentAt: {
      type: Date,
    },
    lastReplyTemplateKey: {
      type: String,
      enum: ['acknowledgement', 'qualified_next_steps', 'not_a_fit_polite', 'reschedule_no_show'],
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstResponseAt: {
      type: Date,
    },
    scheduledAt: {
      type: Date,
    },
    lastContactAt: {
      type: Date,
    },
    nextActionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

demoRequestSchema.index({ createdAt: -1 });
demoRequestSchema.index({ status: 1, createdAt: -1 });
demoRequestSchema.index({ ownerAdminId: 1, status: 1, createdAt: -1 });

export const DemoRequest = mongoose.model<IDemoRequest>('DemoRequest', demoRequestSchema);
