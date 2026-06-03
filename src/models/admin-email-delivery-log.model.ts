import mongoose, { Document, Schema } from 'mongoose';

export type AdminEmailDeliveryStatus = 'sent' | 'failed';

export interface IAdminEmailDeliveryLog extends Document {
  campaignId: mongoose.Types.ObjectId;
  recipientEmail: string;
  recipientUserId?: mongoose.Types.ObjectId;
  status: AdminEmailDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminEmailDeliveryLogSchema = new Schema<IAdminEmailDeliveryLog>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminEmailCampaign',
      required: true,
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [500, 'Error message cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

adminEmailDeliveryLogSchema.index({ campaignId: 1, createdAt: -1 });
adminEmailDeliveryLogSchema.index({ recipientUserId: 1, createdAt: -1 });

export const AdminEmailDeliveryLog = mongoose.model<IAdminEmailDeliveryLog>(
  'AdminEmailDeliveryLog',
  adminEmailDeliveryLogSchema
);
