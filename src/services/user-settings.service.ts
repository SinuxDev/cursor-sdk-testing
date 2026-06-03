import mongoose from 'mongoose';
import {
  IAdminSettings,
  IAttendeeSettings,
  IOrganizerSettings,
  IUser,
  IUserPreferences,
} from '../models/user.model';
import { userRepository } from '../repositories/user.repository';
import { adminAuditLogRepository } from '../repositories/admin-audit-log.repository';
import { AppError } from '../utils/AppError';

interface ProfileUpdatePayload {
  userId: string;
  name?: string;
  avatar?: string;
}

interface PasswordChangePayload {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

interface PreferencesUpdatePayload {
  userId: string;
  preferences: Partial<IUserPreferences>;
}

interface AttendeeSettingsUpdatePayload {
  userId: string;
  settings: Partial<IAttendeeSettings>;
}

interface OrganizerSettingsUpdatePayload {
  userId: string;
  settings: Partial<IOrganizerSettings>;
}

interface AdminSettingsUpdatePayload {
  userId: string;
  settings: Partial<IAdminSettings>;
}

class UserSettingsService {
  private readonly defaultPreferences: IUserPreferences = {
    timezone: 'UTC',
    locale: 'en-US',
    dateFormat: 'mdy',
    timeFormat: '12h',
    weekStartsOn: 'monday',
    marketingOptIn: false,
    notifications: {
      eventReminders: true,
      eventAnnouncements: true,
      eventUpdates: true,
      productUpdates: false,
    },
  };

  private readonly defaultAttendeeSettings: IAttendeeSettings = {
    interests: [],
    preferredAttendanceModes: ['in_person', 'online'],
    directMessagesEnabled: true,
    showProfileToOtherAttendees: false,
    autoAddTicketsToWallet: false,
  };

  private readonly defaultOrganizerSettings: IOrganizerSettings = {
    organizationName: undefined,
    supportEmail: undefined,
    websiteUrl: undefined,
    brandPrimaryColor: undefined,
    defaultEventTimezone: 'UTC',
    defaultCurrency: 'USD',
    defaultReminderHours: [24, 1],
    payout: {
      accountHolderName: undefined,
      bankName: undefined,
      accountLast4: undefined,
      payoutSchedule: 'biweekly',
    },
  };

  private readonly defaultAdminSettings: IAdminSettings = {
    securityAlertsEmail: undefined,
    requireMfaForAdmins: false,
    defaultAuditRetentionDays: 365,
    strictIpLogging: true,
    emailCampaignApprovalRequired: false,
  };

  private async getActiveUser(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    return user;
  }

  async getSettingsSnapshot(userId: string) {
    const user = await this.getActiveUser(userId);

    return {
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        provider: user.provider,
      },
      preferences: {
        ...this.defaultPreferences,
        ...(user.preferences || {}),
        notifications: {
          ...this.defaultPreferences.notifications,
          ...(user.preferences?.notifications || {}),
        },
      },
      attendeeSettings: {
        ...this.defaultAttendeeSettings,
        ...(user.attendeeSettings || {}),
      },
      organizerSettings: {
        ...this.defaultOrganizerSettings,
        ...(user.organizerSettings || {}),
        payout: {
          ...this.defaultOrganizerSettings.payout,
          ...(user.organizerSettings?.payout || {}),
        },
      },
      adminSettings: {
        ...this.defaultAdminSettings,
        ...(user.adminSettings || {}),
      },
    };
  }

  async updateProfile(payload: ProfileUpdatePayload) {
    const user = await this.getActiveUser(payload.userId);

    if (typeof payload.name === 'string') {
      user.name = payload.name.trim();
    }

    if (typeof payload.avatar === 'string') {
      user.avatar = payload.avatar.trim() || undefined;
    }

    await user.save();

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      provider: user.provider,
    };
  }

  async changePassword(payload: PasswordChangePayload) {
    const user = await userRepository.findOneWithPassword({ _id: payload.userId });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    if (user.provider !== 'credentials') {
      throw new AppError('Password change is only available for credential accounts', 400);
    }

    const isCurrentPasswordValid = await user.comparePassword(payload.currentPassword);

    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = payload.newPassword;
    await user.save();
  }

  async updatePreferences(payload: PreferencesUpdatePayload) {
    const user = await this.getActiveUser(payload.userId);

    const current = user.preferences || this.defaultPreferences;
    user.preferences = {
      ...current,
      ...payload.preferences,
      notifications: {
        ...current.notifications,
        ...payload.preferences.notifications,
      },
    };

    await user.save();

    return user.preferences;
  }

  async updateAttendeeSettings(payload: AttendeeSettingsUpdatePayload) {
    const user = await this.getActiveUser(payload.userId);

    const current = user.attendeeSettings || this.defaultAttendeeSettings;
    user.attendeeSettings = {
      ...current,
      ...payload.settings,
    };

    await user.save();

    return user.attendeeSettings;
  }

  async updateOrganizerSettings(payload: OrganizerSettingsUpdatePayload) {
    const user = await this.getActiveUser(payload.userId);

    if (user.role !== 'organizer' && user.role !== 'admin') {
      throw new AppError('Only organizer or admin users can update organizer settings', 403);
    }

    const current = user.organizerSettings || this.defaultOrganizerSettings;
    user.organizerSettings = {
      ...current,
      ...payload.settings,
      payout: {
        ...current.payout,
        ...payload.settings.payout,
      },
    };

    await user.save();

    return user.organizerSettings;
  }

  async updateAdminSettings(payload: AdminSettingsUpdatePayload) {
    const user = await this.getActiveUser(payload.userId);

    if (user.role !== 'admin') {
      throw new AppError('Only admins can update admin settings', 403);
    }

    const current = user.adminSettings || this.defaultAdminSettings;
    user.adminSettings = {
      ...current,
      ...payload.settings,
    };

    await user.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(payload.userId),
      targetUserId: new mongoose.Types.ObjectId(payload.userId),
      action: 'admin.settings.updated',
      reason: 'Admin updated security and governance settings',
      metadata: {
        updatedFields: Object.keys(payload.settings),
      },
    });

    return user.adminSettings;
  }
}

export const userSettingsService = new UserSettingsService();
