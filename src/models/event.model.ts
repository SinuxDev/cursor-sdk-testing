import mongoose, { Document, Schema } from 'mongoose';

export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventAttendanceMode = 'in_person' | 'online' | 'hybrid';
export type EventVisibility = 'public' | 'unlisted' | 'private';
export type TicketType = 'free' | 'paid' | 'donation';
export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox';

export interface IEventTicket {
  name: string;
  type: TicketType;
  quantity: number;
  price?: number;
  currency?: string;
  salesStartAt?: Date;
  salesEndAt?: Date;
  minPerOrder?: number;
  maxPerOrder?: number;
}

export interface IEventQuestion {
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

export interface IEvent extends Document {
  title: string;
  shortSummary: string;
  description: string;
  category: string;
  tags: string[];
  coverImage?: string;
  attendanceMode: EventAttendanceMode;
  venueName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  onlineEventUrl?: string;
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  capacity: number;
  /** Max registered RSVPs; defaults to capacity when unset. */
  rsvpLimit?: number;
  visibility: EventVisibility;
  status: EventStatus;
  organizerName: string;
  organizerUrl?: string;
  contactEmail: string;
  refundPolicy?: string;
  tickets: IEventTicket[];
  attendeeQuestions: IEventQuestion[];
  organizerId: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<IEventTicket>(
  {
    name: {
      type: String,
      required: [true, 'Ticket name is required'],
      trim: true,
      minlength: [2, 'Ticket name must be at least 2 characters'],
      maxlength: [80, 'Ticket name cannot exceed 80 characters'],
    },
    type: {
      type: String,
      enum: ['free', 'paid', 'donation'],
      required: [true, 'Ticket type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Ticket quantity is required'],
      min: [1, 'Ticket quantity must be at least 1'],
    },
    price: {
      type: Number,
      min: [0, 'Ticket price cannot be negative'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: [3, 'Currency must be a valid ISO code'],
      maxlength: [3, 'Currency must be a valid ISO code'],
    },
    salesStartAt: {
      type: Date,
    },
    salesEndAt: {
      type: Date,
    },
    minPerOrder: {
      type: Number,
      min: [1, 'minPerOrder must be at least 1'],
    },
    maxPerOrder: {
      type: Number,
      min: [1, 'maxPerOrder must be at least 1'],
    },
  },
  { _id: false }
);

const questionSchema = new Schema<IEventQuestion>(
  {
    label: {
      type: String,
      required: [true, 'Question label is required'],
      trim: true,
      minlength: [2, 'Question label must be at least 2 characters'],
      maxlength: [120, 'Question label cannot exceed 120 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'select', 'checkbox'],
      required: [true, 'Question type is required'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    shortSummary: {
      type: String,
      required: [true, 'Short summary is required'],
      trim: true,
      minlength: [10, 'Short summary must be at least 10 characters'],
      maxlength: [160, 'Short summary cannot exceed 160 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [60, 'Category cannot exceed 60 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImage: {
      type: String,
      trim: true,
    },
    attendanceMode: {
      type: String,
      enum: ['in_person', 'online', 'hybrid'],
      required: [true, 'Attendance mode is required'],
    },
    venueName: {
      type: String,
      trim: true,
      maxlength: [120, 'Venue name cannot exceed 120 characters'],
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: [160, 'Address line cannot exceed 160 characters'],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [160, 'Address line cannot exceed 160 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [80, 'City cannot exceed 80 characters'],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [80, 'State cannot exceed 80 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [80, 'Country cannot exceed 80 characters'],
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
    onlineEventUrl: {
      type: String,
      trim: true,
    },
    startDateTime: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDateTime: {
      type: Date,
      required: [true, 'End date is required'],
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      trim: true,
      maxlength: [100, 'Timezone cannot exceed 100 characters'],
    },
    registrationOpenAt: {
      type: Date,
    },
    registrationCloseAt: {
      type: Date,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    rsvpLimit: {
      type: Number,
      min: [1, 'RSVP limit must be at least 1'],
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'draft',
    },
    organizerName: {
      type: String,
      required: [true, 'Organizer name is required'],
      trim: true,
      maxlength: [120, 'Organizer name cannot exceed 120 characters'],
    },
    organizerUrl: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email'],
    },
    refundPolicy: {
      type: String,
      trim: true,
      maxlength: [2000, 'Refund policy cannot exceed 2000 characters'],
    },
    tickets: {
      type: [ticketSchema],
      default: [],
    },
    attendeeQuestions: {
      type: [questionSchema],
      default: [],
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
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

eventSchema.index({ organizerId: 1, createdAt: -1 });
eventSchema.index({ status: 1, startDateTime: 1 });

export function getEventRsvpLimit(event: Pick<IEvent, 'rsvpLimit' | 'capacity'>): number {
  return event.rsvpLimit ?? event.capacity;
}

export const Event = mongoose.model<IEvent>('Event', eventSchema);
