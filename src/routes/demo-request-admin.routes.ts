import { Router } from 'express';
import { demoRequestAdminController } from '../controllers/demo-request-admin.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { demoRequestAdminValidation } from '../validations/demo-request-admin.validation';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', validateRequest(demoRequestAdminValidation.list), demoRequestAdminController.list);
router.get(
  '/analytics',
  validateRequest(demoRequestAdminValidation.analytics),
  demoRequestAdminController.getAnalytics
);
router.get(
  '/:id',
  validateRequest(demoRequestAdminValidation.getById),
  demoRequestAdminController.getById
);
router.patch(
  '/:id/assign',
  validateRequest(demoRequestAdminValidation.assign),
  demoRequestAdminController.assign
);
router.patch(
  '/:id/status',
  validateRequest(demoRequestAdminValidation.updateStatus),
  demoRequestAdminController.updateStatus
);
router.patch(
  '/:id/follow-up',
  validateRequest(demoRequestAdminValidation.updateFollowUp),
  demoRequestAdminController.updateFollowUp
);
router.post(
  '/:id/reply',
  validateRequest(demoRequestAdminValidation.sendReply),
  demoRequestAdminController.sendReply
);

export default router;
