import mongoose, { Document, Schema } from 'mongoose';

export type ComplianceCaseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceCaseStatus = 'open' | 'in_review' | 'actioned' | 'resolved';
export type ComplianceCaseCategory =
  | 'account_abuse'
  | 'content_policy'
  | 'payment_risk'
  | 'policy_violation'
  | 'other';

export interface IComplianceCase extends Document {
  title: string;
  description: string;
  category: ComplianceCaseCategory;
  severity: ComplianceCaseSeverity;
  status: ComplianceCaseStatus;
  linkedUserId?: mongoose.Types.ObjectId;
  linkedEventId?: mongoose.Types.ObjectId;
  assignedAdminId?: mongoose.Types.ObjectId;
  createdByAdminId: mongoose.Types.ObjectId;
  dueAt?: Date;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const complianceCaseSchema = new Schema<IComplianceCase>(
  {
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true,
      minlength: [3, 'Case title must be at least 3 characters'],
      maxlength: [120, 'Case title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Case description is required'],
      trim: true,
      minlength: [5, 'Case description must be at least 5 characters'],
      maxlength: [2000, 'Case description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ['account_abuse', 'content_policy', 'payment_risk', 'policy_violation', 'other'],
      required: [true, 'Case category is required'],
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: [true, 'Case severity is required'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'actioned', 'resolved'],
      required: true,
      default: 'open',
    },
    linkedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    linkedEventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
    assignedAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueAt: {
      type: Date,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution note cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

complianceCaseSchema.index({ status: 1, severity: -1, createdAt: -1 });
complianceCaseSchema.index({ linkedUserId: 1, createdAt: -1 });
complianceCaseSchema.index({ linkedEventId: 1, createdAt: -1 });

export const ComplianceCase = mongoose.model<IComplianceCase>(
  'ComplianceCase',
  complianceCaseSchema
);
