import { Router } from 'express';
import { demoRequestController } from '../controllers/demo-request.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { demoRequestValidation } from '../validations/demo-request.validation';

const router = Router();

router.post('/', validateRequest(demoRequestValidation.create), demoRequestController.create);

export default router;
