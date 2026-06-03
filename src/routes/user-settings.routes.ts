import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { userSettingsController } from '../controllers/user-settings.controller';
import { userSettingsValidation } from '../validations/user-settings.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userSettingsController.getSettings);
router.patch(
  '/me/profile',
  validateRequest(userSettingsValidation.updateProfile),
  userSettingsController.updateProfile
);
router.post(
  '/me/change-password',
  validateRequest(userSettingsValidation.changePassword),
  userSettingsController.changePassword
);
router.patch(
  '/me/preferences',
  validateRequest(userSettingsValidation.updatePreferences),
  userSettingsController.updatePreferences
);
router.patch(
  '/me/attendee',
  validateRequest(userSettingsValidation.updateAttendeeSettings),
  userSettingsController.updateAttendeeSettings
);
router.patch(
  '/me/organizer',
  validateRequest(userSettingsValidation.updateOrganizerSettings),
  userSettingsController.updateOrganizerSettings
);
router.patch(
  '/me/admin',
  validateRequest(userSettingsValidation.updateAdminSettings),
  userSettingsController.updateAdminSettings
);

export default router;
