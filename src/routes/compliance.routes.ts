import { Router } from 'express';
import { complianceController } from '../controllers/compliance.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { complianceValidation } from '../validations/compliance.validation';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/risk-overview', complianceController.getRiskOverview);
router.get(
  '/cases',
  validateRequest(complianceValidation.listCases),
  complianceController.listCases
);
router.post(
  '/cases',
  validateRequest(complianceValidation.createCase),
  complianceController.createCase
);
router.patch(
  '/cases/:id/status',
  validateRequest(complianceValidation.updateCaseStatus),
  complianceController.updateCaseStatus
);

export default router;
