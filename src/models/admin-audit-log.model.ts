import mongoose, { Document, Schema } from 'mongoose';

export type AdminAuditAction =
  | 'user.role.updated'
  | 'user.suspension.updated'
  | 'compliance.case.created'
  | 'compliance.case.status.updated'
  | 'admin.email.campaign.sent'
  | 'admin.settings.updated'
  | 'demo.request.assigned'
  | 'demo.request.status.updated'
  | 'demo.request.followup.updated'
  | 'demo.request.reply.sent';

export interface IAdminAuditLog extends Document {
  actorUserId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  action: AdminAuditAction;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'user.role.updated',
        'user.suspension.updated',
        'compliance.case.created',
        'compliance.case.status.updated',
        'admin.email.campaign.sent',
        'admin.settings.updated',
        'demo.request.assigned',
        'demo.request.status.updated',
        'demo.request.followup.updated',
        'demo.request.reply.sent',
      ],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
      maxlength: [300, 'Reason cannot exceed 300 characters'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });

export const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);
