import { body } from 'express-validator';

const colorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export const userSettingsValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
    body('avatar')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Avatar URL must be at most 500 characters'),
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number'),
  ],

  updatePreferences: [
    body('timezone')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Timezone is invalid'),
    body('locale').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Locale is invalid'),
    body('dateFormat').optional().isIn(['mdy', 'dmy', 'ymd']).withMessage('Date format is invalid'),
    body('timeFormat').optional().isIn(['12h', '24h']).withMessage('Time format is invalid'),
    body('weekStartsOn')
      .optional()
      .isIn(['sunday', 'monday'])
      .withMessage('Week start day is invalid'),
    body('marketingOptIn')
      .optional()
      .isBoolean()
      .withMessage('marketingOptIn must be boolean')
      .toBoolean(),
    body('notifications').optional().isObject().withMessage('notifications must be an object'),
    body('notifications.eventReminders')
      .optional()
      .isBoolean()
      .withMessage('eventReminders must be boolean')
      .toBoolean(),
    body('notifications.eventAnnouncements')
      .optional()
      .isBoolean()
      .withMessage('eventAnnouncements must be boolean')
      .toBoolean(),
    body('notifications.eventUpdates')
      .optional()
      .isBoolean()
      .withMessage('eventUpdates must be boolean')
      .toBoolean(),
    body('notifications.productUpdates')
      .optional()
      .isBoolean()
      .withMessage('productUpdates must be boolean')
      .toBoolean(),
  ],

  updateAttendeeSettings: [
    body('interests').optional().isArray({ max: 20 }).withMessage('interests must be an array'),
    body('interests.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 40 })
      .withMessage('Interest values must be between 1 and 40 characters'),
    body('preferredAttendanceModes')
      .optional()
      .isArray({ max: 3 })
      .withMessage('preferredAttendanceModes must be an array'),
    body('preferredAttendanceModes.*')
      .optional()
      .isIn(['in_person', 'online', 'hybrid'])
      .withMessage('Attendance mode is invalid'),
    body('directMessagesEnabled')
      .optional()
      .isBoolean()
      .withMessage('directMessagesEnabled must be boolean')
      .toBoolean(),
    body('showProfileToOtherAttendees')
      .optional()
      .isBoolean()
      .withMessage('showProfileToOtherAttendees must be boolean')
      .toBoolean(),
    body('autoAddTicketsToWallet')
      .optional()
      .isBoolean()
      .withMessage('autoAddTicketsToWallet must be boolean')
      .toBoolean(),
  ],

  updateOrganizerSettings: [
    body('organizationName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('organizationName must be between 2 and 120 characters'),
    body('supportEmail').optional().isEmail().withMessage('supportEmail must be a valid email'),
    body('websiteUrl').optional().isURL().withMessage('websiteUrl must be a valid URL'),
    body('brandPrimaryColor')
      .optional()
      .matches(colorRegex)
      .withMessage('brandPrimaryColor must be a valid hex color'),
    body('defaultEventTimezone')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('defaultEventTimezone is invalid'),
    body('defaultCurrency')
      .optional()
      .trim()
      .isLength({ min: 3, max: 3 })
      .withMessage('defaultCurrency must be an ISO currency code')
      .toUpperCase(),
    body('defaultReminderHours')
      .optional()
      .isArray({ max: 10 })
      .withMessage('defaultReminderHours must be an array'),
    body('defaultReminderHours.*')
      .optional()
      .isInt({ min: 1, max: 720 })
      .withMessage('Reminder hours must be between 1 and 720')
      .toInt(),
    body('payout').optional().isObject().withMessage('payout must be an object'),
    body('payout.accountHolderName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('accountHolderName must be between 2 and 120 characters'),
    body('payout.bankName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('bankName must be between 2 and 120 characters'),
    body('payout.accountLast4')
      .optional()
      .matches(/^\d{4}$/)
      .withMessage('accountLast4 must be exactly 4 digits'),
    body('payout.payoutSchedule')
      .optional()
      .isIn(['weekly', 'biweekly', 'monthly'])
      .withMessage('payoutSchedule is invalid'),
  ],

  updateAdminSettings: [
    body('securityAlertsEmail')
      .optional()
      .isEmail()
      .withMessage('securityAlertsEmail must be a valid email'),
    body('requireMfaForAdmins')
      .optional()
      .isBoolean()
      .withMessage('requireMfaForAdmins must be boolean')
      .toBoolean(),
    body('defaultAuditRetentionDays')
      .optional()
      .isInt({ min: 30, max: 3650 })
      .withMessage('defaultAuditRetentionDays must be between 30 and 3650')
      .toInt(),
    body('strictIpLogging')
      .optional()
      .isBoolean()
      .withMessage('strictIpLogging must be boolean')
      .toBoolean(),
    body('emailCampaignApprovalRequired')
      .optional()
      .isBoolean()
      .withMessage('emailCampaignApprovalRequired must be boolean')
      .toBoolean(),
  ],
};
