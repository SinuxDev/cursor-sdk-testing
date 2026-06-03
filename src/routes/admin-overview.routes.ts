import { Router } from 'express';
import { adminOverviewController } from '../controllers/admin-overview.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { adminOverviewValidation } from '../validations/admin-overview.validation';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get(
  '/charts',
  validateRequest(adminOverviewValidation.getCharts),
  adminOverviewController.getCharts
);

export default router;
