import { Router } from 'express';
import { appealRequestController } from '../controllers/appeal-request.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { appealRequestValidation } from '../validations/appeal-request.validation';

const router = Router();

router.post('/', validateRequest(appealRequestValidation.create), appealRequestController.create);

router.get(
  '/admin',
  authenticate,
  requireRole('admin'),
  validateRequest(appealRequestValidation.listAdmin),
  appealRequestController.listAdminAppeals
);

router.patch(
  '/admin/:id/status',
  authenticate,
  requireRole('admin'),
  validateRequest(appealRequestValidation.updateAdminStatus),
  appealRequestController.updateAdminAppealStatus
);

export default router;
