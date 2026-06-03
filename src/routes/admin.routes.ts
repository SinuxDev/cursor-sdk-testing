import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { adminValidation } from '../validations/admin.validation';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', validateRequest(adminValidation.listUsers), adminController.listUsers);
router.get('/events', validateRequest(adminValidation.listEvents), adminController.listEvents);
router.get(
  '/events/:id',
  validateRequest(adminValidation.getEventById),
  adminController.getEventById
);
router.get(
  '/audit-logs',
  validateRequest(adminValidation.listAuditLogs),
  adminController.listAuditLogs
);
router.patch(
  '/users/:id/role',
  validateRequest(adminValidation.updateRole),
  adminController.updateRole
);
router.patch(
  '/users/:id/suspension',
  validateRequest(adminValidation.updateSuspension),
  adminController.updateSuspension
);

export default router;
