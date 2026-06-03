import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'attendee' | 'organizer' | 'admin';
export type AuthProvider = 'credentials' | 'google' | 'github';
export type UserDateFormat = 'mdy' | 'dmy' | 'ymd';
export type UserTimeFormat = '12h' | '24h';
export type UserWeekStartsOn = 'sunday' | 'monday';
export type AttendeeModePreference = 'in_person' | 'online' | 'hybrid';
export type PayoutSchedule = 'weekly' | 'biweekly' | 'monthly';

export interface IUserPreferences {
  timezone: string;
  locale: string;
  dateFormat: UserDateFormat;
  timeFormat: UserTimeFormat;
  weekStartsOn: UserWeekStartsOn;
  marketingOptIn: boolean;
  notifications: {
    eventReminders: boolean;
    eventAnnouncements: boolean;
    eventUpdates: boolean;
    productUpdates: boolean;
  };
}

export interface IAttendeeSettings {
  interests: string[];
  preferredAttendanceModes: AttendeeModePreference[];
  directMessagesEnabled: boolean;
  showProfileToOtherAttendees: boolean;
  autoAddTicketsToWallet: boolean;
}

export interface IOrganizerSettings {
  organizationName?: string;
  supportEmail?: string;
  websiteUrl?: string;
  brandPrimaryColor?: string;
  defaultEventTimezone: string;
  defaultCurrency: string;
  defaultReminderHours: number[];
  payout: {
    accountHolderName?: string;
    bankName?: string;
    accountLast4?: string;
    payoutSchedule: PayoutSchedule;
  };
}

export interface IAdminSettings {
  securityAlertsEmail?: string;
  requireMfaForAdmins: boolean;
  defaultAuditRetentionDays: number;
  strictIpLogging: boolean;
  emailCampaignApprovalRequired: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  emailCanonical: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  provider: AuthProvider;
  providerId?: string;
  isSuspended: boolean;
  preferences: IUserPreferences;
  attendeeSettings: IAttendeeSettings;
  organizerSettings: IOrganizerSettings;
  adminSettings: IAdminSettings;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    emailCanonical: {
      type: String,
      required: [true, 'Canonical email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      select: false,
    },
    password: {
      type: String,
      select: false,
      validate: {
        validator(this: IUser, value: string | undefined) {
          if (this.provider !== 'credentials') {
            return true;
          }
          return Boolean(value && value.length >= 8);
        },
        message: 'Password is required for credential-based users',
      },
    },
    role: {
      type: String,
      enum: ['attendee', 'organizer', 'admin'],
      default: 'attendee',
    },
    avatar: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github'],
      default: 'credentials',
    },
    providerId: {
      type: String,
      trim: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    preferences: {
      timezone: {
        type: String,
        default: 'UTC',
        trim: true,
      },
      locale: {
        type: String,
        default: 'en-US',
        trim: true,
      },
      dateFormat: {
        type: String,
        enum: ['mdy', 'dmy', 'ymd'],
        default: 'mdy',
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h',
      },
      weekStartsOn: {
        type: String,
        enum: ['sunday', 'monday'],
        default: 'monday',
      },
      marketingOptIn: {
        type: Boolean,
        default: false,
      },
      notifications: {
        eventReminders: {
          type: Boolean,
          default: true,
        },
        eventAnnouncements: {
          type: Boolean,
          default: true,
        },
        eventUpdates: {
          type: Boolean,
          default: true,
        },
        productUpdates: {
          type: Boolean,
          default: false,
        },
      },
    },
    attendeeSettings: {
      interests: {
        type: [String],
        default: [],
      },
      preferredAttendanceModes: {
        type: [String],
        enum: ['in_person', 'online', 'hybrid'],
        default: ['in_person', 'online'],
      },
      directMessagesEnabled: {
        type: Boolean,
        default: true,
      },
      showProfileToOtherAttendees: {
        type: Boolean,
        default: false,
      },
      autoAddTicketsToWallet: {
        type: Boolean,
        default: false,
      },
    },
    organizerSettings: {
      organizationName: {
        type: String,
        trim: true,
      },
      supportEmail: {
        type: String,
        trim: true,
      },
      websiteUrl: {
        type: String,
        trim: true,
      },
      brandPrimaryColor: {
        type: String,
        trim: true,
      },
      defaultEventTimezone: {
        type: String,
        default: 'UTC',
        trim: true,
      },
      defaultCurrency: {
        type: String,
        default: 'USD',
        trim: true,
      },
      defaultReminderHours: {
        type: [Number],
        default: [24, 1],
      },
      payout: {
        accountHolderName: {
          type: String,
          trim: true,
        },
        bankName: {
          type: String,
          trim: true,
        },
        accountLast4: {
          type: String,
          trim: true,
        },
        payoutSchedule: {
          type: String,
          enum: ['weekly', 'biweekly', 'monthly'],
          default: 'biweekly',
        },
      },
    },
    adminSettings: {
      securityAlertsEmail: {
        type: String,
        trim: true,
      },
      requireMfaForAdmins: {
        type: Boolean,
        default: false,
      },
      defaultAuditRetentionDays: {
        type: Number,
        default: 365,
      },
      strictIpLogging: {
        type: Boolean,
        default: true,
      },
      emailCampaignApprovalRequired: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.emailCanonical;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ provider: 1, providerId: 1 }, { sparse: true });

userSchema.pre('validate', function preValidate(next) {
  if (typeof this.email === 'string') {
    const trimmedEmail = this.email.trim();
    this.email = trimmedEmail;
    this.emailCanonical = trimmedEmail.toLowerCase();
  }

  next();
});

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password') || !this.password) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword: string) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
