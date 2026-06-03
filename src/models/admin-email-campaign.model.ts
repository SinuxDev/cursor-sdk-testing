import mongoose, { Document, Schema } from 'mongoose';

export type AdminEmailAudienceRole = 'attendee' | 'organizer' | 'admin';
export type AdminEmailAudienceStatus = 'all' | 'active' | 'suspended';
export type AdminEmailAudienceMode = 'segment' | 'manual';
export type AdminEmailCampaignStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IAdminEmailCampaign extends Document {
  subject: string;
  body: string;
  audienceMode: AdminEmailAudienceMode;
  targetRoles: AdminEmailAudienceRole[];
  targetStatus: AdminEmailAudienceStatus;
  selectedUserIds: mongoose.Types.ObjectId[];
  createdByAdminId: mongoose.Types.ObjectId;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: AdminEmailCampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

const adminEmailCampaignSchema = new Schema<IAdminEmailCampaign>(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [3, 'Subject must be at least 3 characters'],
      maxlength: [160, 'Subject cannot exceed 160 characters'],
    },
    body: {
      type: String,
      required: [true, 'Email body is required'],
      trim: true,
      minlength: [5, 'Email body must be at least 5 characters'],
      maxlength: [10000, 'Email body cannot exceed 10000 characters'],
    },
    audienceMode: {
      type: String,
      enum: ['segment', 'manual'],
      default: 'segment',
    },
    targetRoles: {
      type: [String],
      enum: ['attendee', 'organizer', 'admin'],
      default: ['attendee', 'organizer'],
    },
    targetStatus: {
      type: String,
      enum: ['all', 'active', 'suspended'],
      default: 'all',
    },
    selectedUserIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalRecipients: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
  },
  {
    timestamps: true,
  }
);

adminEmailCampaignSchema.index({ createdAt: -1 });
adminEmailCampaignSchema.index({ createdByAdminId: 1, createdAt: -1 });

export const AdminEmailCampaign = mongoose.model<IAdminEmailCampaign>(
  'AdminEmailCampaign',
  adminEmailCampaignSchema
);
