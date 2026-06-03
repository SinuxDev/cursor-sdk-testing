import { Router } from 'express';
import { adminEmailController } from '../controllers/admin-email.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { adminEmailValidation } from '../validations/admin-email.validation';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.post(
  '/campaigns/send',
  validateRequest(adminEmailValidation.sendCampaign),
  adminEmailController.sendCampaign
);
router.get(
  '/campaigns',
  validateRequest(adminEmailValidation.listCampaigns),
  adminEmailController.listCampaigns
);
router.get(
  '/campaigns/:id/logs',
  validateRequest(adminEmailValidation.listCampaignDeliveryLogs),
  adminEmailController.listCampaignDeliveryLogs
);

export default router;
