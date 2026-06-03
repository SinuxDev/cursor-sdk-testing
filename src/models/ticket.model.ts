import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  rsvp: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  qrCode: string;
  shortCode?: string;
  qrCodeImage?: string;
  isCheckedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    rsvp: {
      type: Schema.Types.ObjectId,
      ref: 'Rsvp',
      required: true,
    },
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
    qrCode: {
      type: String,
      required: [true, 'QR code is required'],
      trim: true,
      unique: true,
    },
    shortCode: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 8,
      maxlength: 8,
    },
    qrCodeImage: {
      type: String,
      trim: true,
    },
    isCheckedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

ticketSchema.index({ rsvp: 1 }, { unique: true });
ticketSchema.index({ shortCode: 1 }, { unique: true, sparse: true });
ticketSchema.index({ event: 1, isCheckedIn: 1 });
ticketSchema.index({ user: 1, event: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
